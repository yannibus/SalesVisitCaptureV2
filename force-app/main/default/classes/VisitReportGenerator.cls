public with sharing class VisitReportGenerator {

    private static final String TEMPLATE_NAME = 'Generate_Visit_Report';
    private static final String INPUT_REF = 'Input:VisitCapture';

    public class Input {
        @InvocableVariable(required=true label='Visit Capture Id')
        public Id visitCaptureId;
    }

    public class Output {
        @InvocableVariable(label='Success')
        public Boolean success;
        @InvocableVariable(label='Error message')
        public String errorMessage;
        @InvocableVariable(label='Detected language')
        public String detectedLanguage;
    }

    @InvocableMethod(label='Generate Visit Report' description='Invokes Generate_Visit_Report prompt and writes AI_Report + AI_Action_Plan on Visit_Capture__c' callout=true)
    public static List<Output> run(List<Input> inputs) {
        List<Output> results = new List<Output>();
        List<Visit_Capture__c> toUpdate = new List<Visit_Capture__c>();

        for (Input i : inputs) {
            Output o = new Output();
            try {
                String rawResponse = invokePrompt(i.visitCaptureId);
                Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(cleanJson(rawResponse));

                String report = stringOrNull(parsed.get('aiReport'));
                String lang = stringOrNull(parsed.get('detectedLanguage'));
                Object actionPlanRaw = parsed.get('actionPlan');
                String actionPlanJson = actionPlanRaw == null ? null : JSON.serialize(actionPlanRaw);

                Visit_Capture__c upd = new Visit_Capture__c(Id = i.visitCaptureId);
                upd.AI_Report__c = report;
                upd.AI_Action_Plan__c = actionPlanJson;
                upd.Detected_Language__c = lang;
                upd.Action_Plan_Materialized__c = false;
                toUpdate.add(upd);

                o.success = true;
                o.detectedLanguage = lang;
            } catch (Exception e) {
                o.success = false;
                o.errorMessage = e.getMessage();
            }
            results.add(o);
        }

        if (!toUpdate.isEmpty()) {
            update toUpdate;
        }
        return results;
    }

    private static String invokePrompt(Id visitCaptureId) {
        ConnectApi.WrappedValue wrapped = new ConnectApi.WrappedValue();
        wrapped.value = new Map<String, String>{ 'id' => String.valueOf(visitCaptureId) };

        ConnectApi.EinsteinPromptTemplateGenerationsInput req =
            new ConnectApi.EinsteinPromptTemplateGenerationsInput();
        req.inputParams = new Map<String, ConnectApi.WrappedValue>{
            INPUT_REF => wrapped
        };
        req.isPreview = false;
        req.additionalConfig = new ConnectApi.EinsteinLlmAdditionalConfigInput();
        req.additionalConfig.applicationName = 'PromptBuilderPreview';

        ConnectApi.EinsteinPromptTemplateGenerationsRepresentation resp =
            ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate(TEMPLATE_NAME, req);

        if (resp == null || resp.generations == null || resp.generations.isEmpty()) {
            throw new VisitReportException('Empty response from prompt template');
        }
        return resp.generations[0].text;
    }

    private static String cleanJson(String raw) {
        if (String.isBlank(raw)) return '{}';
        String s = raw.trim();
        if (s.startsWith('```')) {
            Integer firstNl = s.indexOf('\n');
            if (firstNl > 0) s = s.substring(firstNl + 1);
            if (s.endsWith('```')) s = s.substring(0, s.length() - 3);
            s = s.trim();
        }
        Integer firstBrace = s.indexOf('{');
        Integer lastBrace = s.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            s = s.substring(firstBrace, lastBrace + 1);
        }
        return s;
    }

    private static String stringOrNull(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    public class VisitReportException extends Exception {}
}
