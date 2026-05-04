public with sharing class DemoGroundingParser {

    private static final String TEMPLATE_NAME = 'Prep_Demo_Grounding';
    private static final String INPUT_REF = 'Input:DemoContext';

    public class Input {
        @InvocableVariable(required=true label='Demo Context Id')
        public Id demoContextId;
    }

    public class Output {
        @InvocableVariable(label='Success')
        public Boolean success;
        @InvocableVariable(label='Error message')
        public String errorMessage;
    }

    @InvocableMethod(label='Generate Demo Grounding' description='Invokes Prep_Demo_Grounding prompt and writes 5 AI fields on Demo_Context__c' callout=true)
    public static List<Output> run(List<Input> inputs) {
        List<Output> results = new List<Output>();
        List<Demo_Context__c> toUpdate = new List<Demo_Context__c>();

        for (Input i : inputs) {
            Output o = new Output();
            try {
                String rawResponse = invokePrompt(i.demoContextId);
                Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(cleanJson(rawResponse));

                Demo_Context__c upd = new Demo_Context__c(Id = i.demoContextId);
                upd.Company_Profile__c = stringOrNull(parsed.get('companyProfile'));
                upd.Pain_Points__c = stringOrNull(parsed.get('painPoints'));
                upd.Conversation_Hooks__c = stringOrNull(parsed.get('conversationHooks'));
                upd.Objection_Map__c = stringOrNull(parsed.get('objectionMap'));
                upd.Success_Criteria__c = stringOrNull(parsed.get('successCriteria'));
                toUpdate.add(upd);

                o.success = true;
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

    private static String invokePrompt(Id demoContextId) {
        ConnectApi.WrappedValue wrapped = new ConnectApi.WrappedValue();
        wrapped.value = new Map<String, String>{ 'id' => String.valueOf(demoContextId) };

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
            throw new GroundingException('Empty response from prompt template');
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

    public class GroundingException extends Exception {}
}
