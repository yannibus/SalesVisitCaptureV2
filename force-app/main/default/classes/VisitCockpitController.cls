public with sharing class VisitCockpitController {

    public class Summary {
        @AuraEnabled public Integer totalVisits;
        @AuraEnabled public Integer missingReports;
        @AuraEnabled public Integer reportsWithoutPlan;
        @AuraEnabled public Integer tasksCreated;
        @AuraEnabled public Integer eventsCreated;
        @AuraEnabled public Integer eciCaptured;
        @AuraEnabled public Integer manualCaptured;
        @AuraEnabled public Integer totalVisitsPrevious;
        @AuraEnabled public Integer missingReportsPrevious;
        @AuraEnabled public Integer reportsWithoutPlanPrevious;
        @AuraEnabled public Integer eciCapturedPrevious;
    }

    public class WeeklyBucket {
        @AuraEnabled public String label;
        @AuraEnabled public Date weekStart;
        @AuraEnabled public Integer count;
    }

    public class TopAccount {
        @AuraEnabled public Id accountId;
        @AuraEnabled public String accountName;
        @AuraEnabled public Integer visitCount;
        @AuraEnabled public Date lastVisitDate;
    }

    public class SourceBreakdown {
        @AuraEnabled public Integer eci;
        @AuraEnabled public Integer dictation;
        @AuraEnabled public Integer manual;
    }

    public class DetailPayload {
        @AuraEnabled public Visit_Capture__c visit;
        @AuraEnabled public List<ContentDocumentLink> files;
        @AuraEnabled public List<Object> actionPlanItems;
        @AuraEnabled public Boolean hasDemoContext;
        @AuraEnabled public String eciTranscript;
    }

    public class RegenResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public String errorMessage;
        @AuraEnabled public String detectedLanguage;
    }

    public class BriefResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public String errorMessage;
    }

    public class MaterializeResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public Integer tasksCreated;
        @AuraEnabled public Integer eventsCreated;
        @AuraEnabled public String errorMessage;
    }

    @AuraEnabled(cacheable=true)
    public static Summary getSummary(String period) {
        DateRange range = resolvePeriod(period);
        DateRange previous = previousPeriod(range);

        Summary s = new Summary();
        s.totalVisits = countVisits(range);
        s.totalVisitsPrevious = countVisits(previous);
        s.missingReports = countMissingReports(range);
        s.missingReportsPrevious = countMissingReports(previous);
        s.reportsWithoutPlan = countReportsWithoutPlan(range);
        s.reportsWithoutPlanPrevious = countReportsWithoutPlan(previous);
        s.eciCaptured = countEciCaptured(range);
        s.eciCapturedPrevious = countEciCaptured(previous);
        s.manualCaptured = s.totalVisits - s.eciCaptured;

        Integer[] taskEventCounts = countTasksAndEvents(range);
        s.tasksCreated = taskEventCounts[0];
        s.eventsCreated = taskEventCounts[1];

        return s;
    }

    @AuraEnabled(cacheable=true)
    public static List<Visit_Capture__c> getMissingReports(String period) {
        DateRange range = resolvePeriod(period);
        return [
            SELECT Id, Name, CreatedDate, Account__r.Name, Contact__r.Name,
                   VideoCall__c, Voice_Transcript__c, Visit_Summary__c
            FROM Visit_Capture__c
            WHERE CreatedDate >= :range.startDt
              AND CreatedDate <= :range.endDt
              AND Detected_Language__c = null
            ORDER BY CreatedDate DESC
            LIMIT 50
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Visit_Capture__c> getMissingPlans(String period) {
        DateRange range = resolvePeriod(period);
        return [
            SELECT Id, Name, CreatedDate, Account__r.Name, Contact__r.Name,
                   AI_Action_Plan__c, Detected_Language__c
            FROM Visit_Capture__c
            WHERE CreatedDate >= :range.startDt
              AND CreatedDate <= :range.endDt
              AND Detected_Language__c != null
              AND Action_Plan_Materialized__c = false
            ORDER BY CreatedDate DESC
            LIMIT 50
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<WeeklyBucket> getWeeklyVolume(String period) {
        DateRange range = resolvePeriod(period);
        Map<Date, Integer> counts = new Map<Date, Integer>();

        for (AggregateResult ar : [
            SELECT WEEK_IN_YEAR(CreatedDate) weekNum, CALENDAR_YEAR(CreatedDate) yr, COUNT(Id) cnt
            FROM Visit_Capture__c
            WHERE CreatedDate >= :range.startDt AND CreatedDate <= :range.endDt
            GROUP BY WEEK_IN_YEAR(CreatedDate), CALENDAR_YEAR(CreatedDate)
            ORDER BY CALENDAR_YEAR(CreatedDate), WEEK_IN_YEAR(CreatedDate)
        ]) {
            Integer weekNum = (Integer) ar.get('weekNum');
            Integer yr = (Integer) ar.get('yr');
            Integer cnt = (Integer) ar.get('cnt');
            Date weekStart = Date.newInstance(yr, 1, 1).addDays((weekNum - 1) * 7);
            counts.put(weekStart, cnt);
        }

        List<WeeklyBucket> buckets = new List<WeeklyBucket>();
        for (Date d : counts.keySet()) {
            WeeklyBucket b = new WeeklyBucket();
            b.weekStart = d;
            b.label = 'S' + ((Datetime) d).format('w');
            b.count = counts.get(d);
            buckets.add(b);
        }
        return buckets;
    }

    @AuraEnabled(cacheable=true)
    public static SourceBreakdown getSourceBreakdown(String period) {
        DateRange range = resolvePeriod(period);
        SourceBreakdown sb = new SourceBreakdown();
        sb.eci = 0;
        sb.dictation = 0;
        sb.manual = 0;

        for (Visit_Capture__c v : [
            SELECT VideoCall__c, Voice_Transcript__c, Visit_Summary__c
            FROM Visit_Capture__c
            WHERE CreatedDate >= :range.startDt AND CreatedDate <= :range.endDt
        ]) {
            if (v.VideoCall__c != null) {
                sb.eci++;
            } else if (String.isNotBlank(v.Voice_Transcript__c)) {
                sb.dictation++;
            } else {
                sb.manual++;
            }
        }
        return sb;
    }

    @AuraEnabled(cacheable=true)
    public static List<TopAccount> getTopAccounts(String period) {
        DateRange range = resolvePeriod(period);
        List<TopAccount> results = new List<TopAccount>();

        for (AggregateResult ar : [
            SELECT Account__c accId, Account__r.Name accName,
                   COUNT(Id) cnt, MAX(CreatedDate) lastVisit
            FROM Visit_Capture__c
            WHERE CreatedDate >= :range.startDt
              AND CreatedDate <= :range.endDt
              AND Account__c != null
            GROUP BY Account__c, Account__r.Name
            ORDER BY COUNT(Id) DESC
            LIMIT 5
        ]) {
            TopAccount t = new TopAccount();
            t.accountId = (Id) ar.get('accId');
            t.accountName = (String) ar.get('accName');
            t.visitCount = (Integer) ar.get('cnt');
            t.lastVisitDate = ((Datetime) ar.get('lastVisit')).date();
            results.add(t);
        }
        return results;
    }

    @AuraEnabled(cacheable=true)
    public static List<Visit_Capture__c> getRecentVisits(String period, Integer maxRows) {
        DateRange range = resolvePeriod(period);
        Integer limitRows = maxRows == null ? 10 : maxRows;
        return [
            SELECT Id, Name, CreatedDate, Account__r.Name, Contact__r.Name,
                   VideoCall__c, Voice_Transcript__c,
                   AI_Report__c, AI_Action_Plan__c, Action_Plan_Materialized__c,
                   Detected_Language__c
            FROM Visit_Capture__c
            WHERE CreatedDate >= :range.startDt AND CreatedDate <= :range.endDt
            ORDER BY CreatedDate DESC
            LIMIT :limitRows
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Demo_Context__c> searchDemoContexts(String term) {
        String key = '%' + (term == null ? '' : term) + '%';
        return [
            SELECT Id, Name, Account_Name__c, Meeting_Type__c, Industry__c
            FROM Demo_Context__c
            WHERE Account_Name__c LIKE :key OR Name LIKE :key
            ORDER BY LastModifiedDate DESC
            LIMIT 20
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Visit_Capture__c> getCapturesForEvent(Id eventId) {
        String eventIdText = String.valueOf(eventId);
        return [
            SELECT Id, Name, CreatedDate,
                   Account__r.Name, Contact__r.Name,
                   AI_Report__c, AI_Action_Plan__c, Action_Plan_Materialized__c,
                   Detected_Language__c, VideoCall__c
            FROM Visit_Capture__c
            WHERE Event__c = :eventIdText
            ORDER BY CreatedDate DESC
        ];
    }

    @AuraEnabled(cacheable=true)
    public static DetailPayload getDetail(Id visitId) {
        DetailPayload d = new DetailPayload();
        d.visit = [
            SELECT Id, Name, CreatedDate,
                   Account__c, Account__r.Name,
                   Contact__c, Contact__r.Name,
                   Opportunity__c, Opportunity__r.Name,
                   Demo_Context__c, Demo_Context__r.Account_Name__c, Demo_Context__r.Meeting_Type__c,
                   VideoCall__c,
                   Voice_Transcript__c, Visit_Summary__c,
                   AI_Report__c, AI_Action_Plan__c, AI_Visit_Brief__c, Action_Plan_Materialized__c,
                   Detected_Language__c
            FROM Visit_Capture__c
            WHERE Id = :visitId
            LIMIT 1
        ];
        d.hasDemoContext = d.visit.Demo_Context__c != null;

        d.files = [
            SELECT Id, ContentDocumentId, ContentDocument.Title,
                   ContentDocument.FileType, ContentDocument.ContentSize,
                   ContentDocument.LatestPublishedVersionId
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :visitId
            ORDER BY SystemModstamp DESC
        ];

        if (String.isNotBlank(d.visit.AI_Action_Plan__c)) {
            try {
                d.actionPlanItems = (List<Object>) JSON.deserializeUntyped(d.visit.AI_Action_Plan__c);
            } catch (Exception e) {
                d.actionPlanItems = new List<Object>();
            }
        } else {
            d.actionPlanItems = new List<Object>();
        }

        d.eciTranscript = d.visit.VideoCall__c != null ? fetchEciTranscript(d.visit.VideoCall__c) : null;
        return d;
    }

    private static String fetchEciTranscript(Id videoCallId) {
        try {
            List<SObject> rows = Database.query(
                'SELECT TranscriptContent FROM VideoCallTranscript WHERE VideoCallId = :videoCallId LIMIT 1'
            );
            if (rows.isEmpty()) return null;
            String raw = (String) rows[0].get('TranscriptContent');
            if (String.isBlank(raw)) return null;
            Map<String, Object> payload = (Map<String, Object>) JSON.deserializeUntyped(raw);
            Object entriesObj = payload.get('transcriptEntries');
            if (!(entriesObj instanceof List<Object>)) return null;
            List<Object> entries = (List<Object>) entriesObj;
            List<String> lines = new List<String>();
            for (Object o : entries) {
                Map<String, Object> e = (Map<String, Object>) o;
                String role = (String) e.get('speakerRole');
                String text = (String) e.get('text');
                if (String.isBlank(text)) continue;
                String prefix = String.isNotBlank(role) ? role + ' : ' : '';
                lines.add(prefix + text.trim());
            }
            return String.join(lines, '\n');
        } catch (Exception e) {
            return null;
        }
    }

    @AuraEnabled
    public static void saveField(Id visitId, String fieldName, String value) {
        Set<String> allowed = new Set<String>{'Voice_Transcript__c', 'Visit_Summary__c'};
        if (!allowed.contains(fieldName)) {
            throw new AuraHandledException('Field not allowed for inline save: ' + fieldName);
        }
        Visit_Capture__c v = new Visit_Capture__c(Id = visitId);
        v.put(fieldName, value);
        update v;
    }

    @AuraEnabled
    public static RegenResult regenerateReport(Id visitId) {
        VisitReportGenerator.Input req = new VisitReportGenerator.Input();
        req.visitCaptureId = visitId;
        List<VisitReportGenerator.Output> outs = VisitReportGenerator.run(
            new List<VisitReportGenerator.Input>{req}
        );
        RegenResult r = new RegenResult();
        r.success = outs[0].success;
        r.errorMessage = outs[0].errorMessage;
        r.detectedLanguage = outs[0].detectedLanguage;
        return r;
    }

    @AuraEnabled
    public static BriefResult generateBrief(Id visitId) {
        VisitBriefGenerator.Input req = new VisitBriefGenerator.Input();
        req.visitCaptureId = visitId;
        List<VisitBriefGenerator.Output> outs = VisitBriefGenerator.run(
            new List<VisitBriefGenerator.Input>{req}
        );
        BriefResult b = new BriefResult();
        b.success = outs[0].success;
        b.errorMessage = outs[0].errorMessage;
        return b;
    }

    @AuraEnabled
    public static MaterializeResult materializePlan(Id visitId) {
        ActionPlanMaterializer.Input req = new ActionPlanMaterializer.Input();
        req.visitCaptureId = visitId;
        List<ActionPlanMaterializer.Output> outs = ActionPlanMaterializer.run(
            new List<ActionPlanMaterializer.Input>{req}
        );
        MaterializeResult m = new MaterializeResult();
        m.success = outs[0].success;
        m.tasksCreated = outs[0].tasksCreated;
        m.eventsCreated = outs[0].eventsCreated;
        m.errorMessage = outs[0].errorMessage;
        return m;
    }

    // === Helpers ===

    private class DateRange {
        Datetime startDt;
        Datetime endDt;
    }

    private static DateRange resolvePeriod(String period) {
        DateRange r = new DateRange();
        Datetime now = System.now();
        r.endDt = now;

        if (period == null || period == 'week') {
            r.startDt = now.addDays(-7);
        } else if (period == 'month') {
            r.startDt = now.addDays(-30);
        } else if (period == 'quarter') {
            r.startDt = now.addDays(-90);
        } else if (period == '4weeks') {
            r.startDt = now.addDays(-28);
        } else {
            r.startDt = now.addDays(-7);
        }
        return r;
    }

    private static DateRange previousPeriod(DateRange current) {
        DateRange p = new DateRange();
        Long spanMs = current.endDt.getTime() - current.startDt.getTime();
        p.endDt = current.startDt;
        p.startDt = Datetime.newInstance(current.startDt.getTime() - spanMs);
        return p;
    }

    private static Integer countVisits(DateRange r) {
        return [
            SELECT COUNT()
            FROM Visit_Capture__c
            WHERE CreatedDate >= :r.startDt AND CreatedDate <= :r.endDt
        ];
    }

    private static Integer countMissingReports(DateRange r) {
        return [
            SELECT COUNT()
            FROM Visit_Capture__c
            WHERE CreatedDate >= :r.startDt AND CreatedDate <= :r.endDt
              AND Detected_Language__c = null
        ];
    }

    private static Integer countReportsWithoutPlan(DateRange r) {
        return [
            SELECT COUNT()
            FROM Visit_Capture__c
            WHERE CreatedDate >= :r.startDt AND CreatedDate <= :r.endDt
              AND Detected_Language__c != null
              AND Action_Plan_Materialized__c = false
        ];
    }

    private static Integer countEciCaptured(DateRange r) {
        return [
            SELECT COUNT()
            FROM Visit_Capture__c
            WHERE CreatedDate >= :r.startDt AND CreatedDate <= :r.endDt
              AND VideoCall__c != null
        ];
    }

    private static Integer[] countTasksAndEvents(DateRange r) {
        Set<Id> visitIds = new Set<Id>();
        for (Visit_Capture__c v : [
            SELECT Id FROM Visit_Capture__c
            WHERE CreatedDate >= :r.startDt AND CreatedDate <= :r.endDt
              AND Action_Plan_Materialized__c = true
        ]) {
            visitIds.add(v.Id);
        }
        if (visitIds.isEmpty()) return new Integer[]{0, 0};

        Integer taskCount = [SELECT COUNT() FROM Task WHERE WhatId IN :visitIds];
        Integer eventCount = [SELECT COUNT() FROM Event WHERE WhatId IN :visitIds];
        return new Integer[]{taskCount, eventCount};
    }
}
