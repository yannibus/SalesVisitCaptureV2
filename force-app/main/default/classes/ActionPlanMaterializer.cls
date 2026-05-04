public with sharing class ActionPlanMaterializer {

    public class Input {
        @InvocableVariable(required=true label='Visit Capture Id')
        public Id visitCaptureId;
    }

    public class Output {
        @InvocableVariable(label='Success')
        public Boolean success;
        @InvocableVariable(label='Tasks created')
        public Integer tasksCreated;
        @InvocableVariable(label='Events created')
        public Integer eventsCreated;
        @InvocableVariable(label='Error message')
        public String errorMessage;
    }

    @InvocableMethod(label='Materialize Action Plan' description='Parses AI_Action_Plan JSON and creates Task + Event records linked to the Visit_Capture.')
    public static List<Output> run(List<Input> inputs) {
        List<Output> results = new List<Output>();

        for (Input i : inputs) {
            Output o = new Output();
            o.tasksCreated = 0;
            o.eventsCreated = 0;
            try {
                Visit_Capture__c vc = [
                    SELECT Id, AI_Action_Plan__c, Account__c, Contact__c, Opportunity__c, OwnerId
                    FROM Visit_Capture__c
                    WHERE Id = :i.visitCaptureId
                    LIMIT 1
                ];

                if (String.isBlank(vc.AI_Action_Plan__c)) {
                    throw new MaterializerException('No action plan JSON to materialize');
                }

                List<Object> items = (List<Object>) JSON.deserializeUntyped(vc.AI_Action_Plan__c);
                if (items.size() > 15) {
                    items = new List<Object>(items);
                    List<Object> trimmed = new List<Object>();
                    for (Integer k = 0; k < 15; k++) trimmed.add(items[k]);
                    items = trimmed;
                }

                Id whatId = vc.Opportunity__c != null ? vc.Opportunity__c
                    : (vc.Account__c != null ? vc.Account__c : vc.Id);
                Id whoId = vc.Contact__c;

                List<Task> newTasks = new List<Task>();
                List<Event> newEvents = new List<Event>();

                for (Object raw : items) {
                    Map<String, Object> item = (Map<String, Object>) raw;
                    String type = stringOrEmpty(item.get('type')).toLowerCase();
                    String title = stringOrEmpty(item.get('title'));
                    String descText = stringOrEmpty(item.get('description'));

                    if (type == 'event') {
                        Event ev = new Event();
                        ev.Subject = title;
                        ev.Description = descText;
                        ev.OwnerId = vc.OwnerId;
                        ev.WhatId = whatId;
                        ev.WhoId = whoId;
                        String startStr = stringOrEmpty(item.get('startDateTime'));
                        Integer dur = item.get('durationMinutes') == null ? 30 : Integer.valueOf(item.get('durationMinutes'));
                        ev.DurationInMinutes = dur;
                        if (String.isNotBlank(startStr)) {
                            try { ev.ActivityDateTime = (DateTime) JSON.deserialize('"' + startStr + '"', DateTime.class); }
                            catch (Exception e) { ev.ActivityDateTime = System.now().addDays(7); }
                        } else {
                            ev.ActivityDateTime = System.now().addDays(7);
                        }
                        newEvents.add(ev);
                    } else {
                        Task t = new Task();
                        t.Subject = title;
                        t.Description = descText;
                        t.OwnerId = vc.OwnerId;
                        t.WhatId = whatId;
                        t.WhoId = whoId;
                        t.Status = 'Not Started';
                        String prio = stringOrEmpty(item.get('priority')).toLowerCase();
                        t.Priority = prio == 'high' ? 'High' : (prio == 'low' ? 'Low' : 'Normal');
                        String dueStr = stringOrEmpty(item.get('dueDate'));
                        if (String.isNotBlank(dueStr)) {
                            try { t.ActivityDate = Date.valueOf(dueStr); }
                            catch (Exception e) { t.ActivityDate = Date.today().addDays(7); }
                        } else {
                            t.ActivityDate = Date.today().addDays(7);
                        }
                        newTasks.add(t);
                    }
                }

                if (!newTasks.isEmpty()) insert newTasks;
                if (!newEvents.isEmpty()) insert newEvents;

                Visit_Capture__c upd = new Visit_Capture__c(Id = vc.Id, Action_Plan_Materialized__c = true);
                update upd;

                o.success = true;
                o.tasksCreated = newTasks.size();
                o.eventsCreated = newEvents.size();
            } catch (Exception e) {
                o.success = false;
                o.errorMessage = e.getMessage();
            }
            results.add(o);
        }
        return results;
    }

    private static String stringOrEmpty(Object o) {
        return o == null ? '' : String.valueOf(o);
    }

    public class MaterializerException extends Exception {}
}
