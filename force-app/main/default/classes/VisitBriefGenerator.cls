public with sharing class VisitBriefGenerator {

    private static final String TEMPLATE_NAME = 'Prepare_Visit_Brief';
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
    }

    @InvocableMethod(label='Generate Visit Brief' description='Invokes Prepare_Visit_Brief prompt and writes AI_Visit_Brief__c (HTML) on Visit_Capture__c' callout=true)
    public static List<Output> run(List<Input> inputs) {
        List<Output> results = new List<Output>();
        List<Visit_Capture__c> toUpdate = new List<Visit_Capture__c>();

        for (Input i : inputs) {
            Output o = new Output();
            try {
                String html = cleanHtml(invokePrompt(i.visitCaptureId));
                if (String.isBlank(html)) {
                    throw new BriefException('Empty HTML in prompt response');
                }

                Visit_Capture__c upd = new Visit_Capture__c(Id = i.visitCaptureId);
                upd.AI_Visit_Brief__c = html;
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
            throw new BriefException('Empty response from prompt template');
        }
        return resp.generations[0].text;
    }

    private static String cleanHtml(String raw) {
        if (String.isBlank(raw)) return '';
        String s = raw.trim();
        if (s.startsWith('```')) {
            Integer firstNl = s.indexOf('\n');
            if (firstNl > 0) s = s.substring(firstNl + 1);
            if (s.endsWith('```')) s = s.substring(0, s.length() - 3);
            s = s.trim();
        }
        Integer firstLt = s.indexOf('<');
        Integer lastGt = s.lastIndexOf('>');
        if (firstLt >= 0 && lastGt > firstLt) {
            s = s.substring(firstLt, lastGt + 1);
        }
        return s;
    }

    public class BriefException extends Exception {}
}
