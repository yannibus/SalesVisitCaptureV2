import { LightningElement, api, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import getDetail from '@salesforce/apex/VisitCockpitController.getDetail';
import saveField from '@salesforce/apex/VisitCockpitController.saveField';
import regenerateReport from '@salesforce/apex/VisitCockpitController.regenerateReport';
import materializePlan from '@salesforce/apex/VisitCockpitController.materializePlan';
import generateBrief from '@salesforce/apex/VisitCockpitController.generateBrief';

import VC_Workspace_Tab_Prep from '@salesforce/label/c.VC_Workspace_Tab_Prep';
import VC_Workspace_Tab_Execution from '@salesforce/label/c.VC_Workspace_Tab_Execution';
import VC_Workspace_Tab_Outcome from '@salesforce/label/c.VC_Workspace_Tab_Outcome';
import VC_Workspace_Prep_Intro from '@salesforce/label/c.VC_Workspace_Prep_Intro';
import VC_Workspace_Execution_Intro from '@salesforce/label/c.VC_Workspace_Execution_Intro';
import VC_Workspace_Outcome_Intro from '@salesforce/label/c.VC_Workspace_Outcome_Intro';
import VC_Workspace_DemoZone_Title from '@salesforce/label/c.VC_Workspace_DemoZone_Title';
import VC_Workspace_DemoZone_Hint from '@salesforce/label/c.VC_Workspace_DemoZone_Hint';
import VC_Workspace_DemoContext_Label from '@salesforce/label/c.VC_Workspace_DemoContext_Label';
import VC_Workspace_CRM_Title from '@salesforce/label/c.VC_Workspace_CRM_Title';
import VC_Workspace_Account from '@salesforce/label/c.VC_Workspace_Account';
import VC_Workspace_Contact from '@salesforce/label/c.VC_Workspace_Contact';
import VC_Workspace_Opportunity from '@salesforce/label/c.VC_Workspace_Opportunity';
import VC_Workspace_VideoCall_Label from '@salesforce/label/c.VC_Workspace_VideoCall_Label';
import VC_Workspace_OpenDemoContext from '@salesforce/label/c.VC_Workspace_OpenDemoContext';
import VC_Workspace_NextToExecution from '@salesforce/label/c.VC_Workspace_NextToExecution';
import VC_Workspace_NextToOutcome from '@salesforce/label/c.VC_Workspace_NextToOutcome';
import VC_Workspace_PrepStep1 from '@salesforce/label/c.VC_Workspace_PrepStep1';
import VC_Workspace_PrepStep2 from '@salesforce/label/c.VC_Workspace_PrepStep2';

import VC_Brief_Section_Title from '@salesforce/label/c.VC_Brief_Section_Title';
import VC_Brief_Section_Hint from '@salesforce/label/c.VC_Brief_Section_Hint';
import VC_Brief_Button_Generate from '@salesforce/label/c.VC_Brief_Button_Generate';
import VC_Brief_Button_Regenerate from '@salesforce/label/c.VC_Brief_Button_Regenerate';
import VC_Brief_Generating from '@salesforce/label/c.VC_Brief_Generating';
import VC_Brief_Toast_Success from '@salesforce/label/c.VC_Brief_Toast_Success';
import VC_Brief_Toast_SuccessMsg from '@salesforce/label/c.VC_Brief_Toast_SuccessMsg';
import VC_Brief_Toast_Failed from '@salesforce/label/c.VC_Brief_Toast_Failed';
import VC_Brief_Empty_Hint from '@salesforce/label/c.VC_Brief_Empty_Hint';

import VC_Detail_Transcript_Label from '@salesforce/label/c.VC_Detail_Transcript_Label';
import VC_Detail_Transcript_Placeholder from '@salesforce/label/c.VC_Detail_Transcript_Placeholder';
import VC_Detail_Summary_Label from '@salesforce/label/c.VC_Detail_Summary_Label';
import VC_Detail_Summary_Placeholder from '@salesforce/label/c.VC_Detail_Summary_Placeholder';
import VC_Detail_Attachments_Label from '@salesforce/label/c.VC_Detail_Attachments_Label';
import VC_Detail_Attachments_Help from '@salesforce/label/c.VC_Detail_Attachments_Help';
import VC_Detail_EciTranscript_Label from '@salesforce/label/c.VC_Detail_EciTranscript_Label';
import VC_Detail_EciTranscript_Help from '@salesforce/label/c.VC_Detail_EciTranscript_Help';
import VC_Detail_Section_AIActions from '@salesforce/label/c.VC_Detail_Section_AIActions';
import VC_Detail_Section_Report from '@salesforce/label/c.VC_Detail_Section_Report';
import VC_Detail_Section_Plan from '@salesforce/label/c.VC_Detail_Section_Plan';
import VC_Detail_GeneratingReport from '@salesforce/label/c.VC_Detail_GeneratingReport';
import VC_Detail_MaterializingPlan from '@salesforce/label/c.VC_Detail_MaterializingPlan';
import VC_Detail_Type_Event from '@salesforce/label/c.VC_Detail_Type_Event';
import VC_Detail_Type_Task from '@salesforce/label/c.VC_Detail_Type_Task';
import VC_Detail_Duration_Minutes from '@salesforce/label/c.VC_Detail_Duration_Minutes';
import VC_Button_GenerateReport from '@salesforce/label/c.VC_Button_GenerateReport';
import VC_Button_RegenerateReport from '@salesforce/label/c.VC_Button_RegenerateReport';
import VC_Button_CreatePlan from '@salesforce/label/c.VC_Button_CreatePlan';
import VC_Button_RecreatePlan from '@salesforce/label/c.VC_Button_RecreatePlan';
import VC_Toast_ReportGenerated from '@salesforce/label/c.VC_Toast_ReportGenerated';
import VC_Toast_ReportLanguage from '@salesforce/label/c.VC_Toast_ReportLanguage';
import VC_Toast_ReportFailed from '@salesforce/label/c.VC_Toast_ReportFailed';
import VC_Toast_PlanMaterialized from '@salesforce/label/c.VC_Toast_PlanMaterialized';
import VC_Toast_PlanResult from '@salesforce/label/c.VC_Toast_PlanResult';
import VC_Toast_PlanFailed from '@salesforce/label/c.VC_Toast_PlanFailed';
import VC_Toast_SaveFailed from '@salesforce/label/c.VC_Toast_SaveFailed';
import VC_Toast_NetworkError from '@salesforce/label/c.VC_Toast_NetworkError';
import VC_Toast_UnknownError from '@salesforce/label/c.VC_Toast_UnknownError';
import VC_Common_LoadError from '@salesforce/label/c.VC_Common_LoadError';
import VC_Common_Error from '@salesforce/label/c.VC_Common_Error';

const AUTOSAVE_DELAY = 1500;

function format(str, ...args) {
    return str.replace(/\{(\d+)\}/g, (m, i) => args[i] !== undefined ? args[i] : m);
}

export default class VcVisitWorkspace extends NavigationMixin(LightningElement) {
    @api recordId;

    @track activeTab = 'prep';
    wiredResult;
    detail;
    error;
    loading = true;
    generatingReport = false;
    materializingPlan = false;
    generatingBrief = false;
    localTranscript = '';
    localSummary = '';
    autosaveTimers = {};

    labels = {
        tabPrep: VC_Workspace_Tab_Prep,
        tabExecution: VC_Workspace_Tab_Execution,
        tabOutcome: VC_Workspace_Tab_Outcome,
        prepIntro: VC_Workspace_Prep_Intro,
        executionIntro: VC_Workspace_Execution_Intro,
        outcomeIntro: VC_Workspace_Outcome_Intro,
        demoZoneTitle: VC_Workspace_DemoZone_Title,
        demoZoneHint: VC_Workspace_DemoZone_Hint,
        demoContextLabel: VC_Workspace_DemoContext_Label,
        crmTitle: VC_Workspace_CRM_Title,
        accountLabel: VC_Workspace_Account,
        contactLabel: VC_Workspace_Contact,
        opportunityLabel: VC_Workspace_Opportunity,
        videoCallLabel: VC_Workspace_VideoCall_Label,
        openDemoContext: VC_Workspace_OpenDemoContext,
        nextToExecution: VC_Workspace_NextToExecution,
        nextToOutcome: VC_Workspace_NextToOutcome,
        prepStep1: VC_Workspace_PrepStep1,
        prepStep2: VC_Workspace_PrepStep2,
        transcriptLabel: VC_Detail_Transcript_Label,
        transcriptPlaceholder: VC_Detail_Transcript_Placeholder,
        summaryLabel: VC_Detail_Summary_Label,
        summaryPlaceholder: VC_Detail_Summary_Placeholder,
        attachmentsLabel: VC_Detail_Attachments_Label,
        attachmentsHelp: VC_Detail_Attachments_Help,
        eciTranscriptLabel: VC_Detail_EciTranscript_Label,
        eciTranscriptHelp: VC_Detail_EciTranscript_Help,
        sectionAI: VC_Detail_Section_AIActions,
        sectionReport: VC_Detail_Section_Report,
        sectionPlan: VC_Detail_Section_Plan,
        generatingReport: VC_Detail_GeneratingReport,
        materializingPlan: VC_Detail_MaterializingPlan,
        briefTitle: VC_Brief_Section_Title,
        briefHint: VC_Brief_Section_Hint,
        briefGenerating: VC_Brief_Generating,
        briefEmptyHint: VC_Brief_Empty_Hint
    };

    @wire(getDetail, { visitId: '$recordId' })
    wiredDetail(result) {
        this.wiredResult = result;
        this.loading = false;
        if (result.data) {
            this.detail = result.data;
            this.localTranscript = result.data.visit.Voice_Transcript__c || '';
            this.localSummary = result.data.visit.Visit_Summary__c || '';
            this.error = null;
        } else if (result.error) {
            this.error = result.error.body ? result.error.body.message : VC_Common_LoadError;
            this.detail = null;
        }
    }

    get visit() {
        return this.detail ? this.detail.visit : null;
    }

    get hasVisit() {
        return !!this.visit;
    }

    get hasDemoContext() {
        return !!(this.detail && this.detail.hasDemoContext);
    }

    get demoContextSummary() {
        if (!this.hasDemoContext || !this.visit.Demo_Context__r) return '';
        const dc = this.visit.Demo_Context__r;
        return `${dc.Account_Name__c || '—'} · ${dc.Meeting_Type__c || '—'}`;
    }

    get demoContextId() {
        return this.visit ? this.visit.Demo_Context__c : null;
    }

    get accountId() {
        return this.visit ? this.visit.Account__c : null;
    }

    get contactId() {
        return this.visit ? this.visit.Contact__c : null;
    }

    get opportunityId() {
        return this.visit ? this.visit.Opportunity__c : null;
    }

    get videoCallId() {
        return this.visit ? this.visit.VideoCall__c : null;
    }

    get hasEciTranscript() {
        return !!(this.detail && this.detail.eciTranscript);
    }

    get eciTranscript() {
        return this.detail ? this.detail.eciTranscript : '';
    }

    get hasBrief() {
        return !!(this.visit && this.visit.AI_Visit_Brief__c);
    }

    get briefHtml() {
        return this.hasBrief ? this.visit.AI_Visit_Brief__c : '';
    }

    get briefButtonLabel() {
        return this.hasBrief ? VC_Brief_Button_Regenerate : VC_Brief_Button_Generate;
    }

    get briefButtonDisabled() {
        return !this.accountId || this.generatingBrief;
    }

    get hasReport() {
        return !!(this.visit && this.visit.AI_Report__c);
    }

    get hasPlan() {
        return !!(this.visit && this.visit.AI_Action_Plan__c);
    }

    get isMaterialized() {
        return !!(this.visit && this.visit.Action_Plan_Materialized__c);
    }

    get reportButtonLabel() {
        return this.hasReport ? VC_Button_RegenerateReport : VC_Button_GenerateReport;
    }

    get planButtonLabel() {
        return this.isMaterialized ? VC_Button_RecreatePlan : VC_Button_CreatePlan;
    }

    get planButtonDisabled() {
        return !this.hasPlan || this.materializingPlan;
    }

    get reportPreviewHtml() {
        return this.hasReport ? this.visit.AI_Report__c : '';
    }

    get actionPlanItems() {
        if (!this.detail) return [];
        return this.detail.actionPlanItems.map((it, i) => ({
            key: i,
            ...it,
            typeLabel: it.type === 'event' ? VC_Detail_Type_Event : VC_Detail_Type_Task,
            typeBadgeClass: it.type === 'event' ? 'vc-badge vc-badge_brand' : 'vc-badge vc-badge_success',
            dateLabel: it.dueDate || (it.startDateTime ? it.startDateTime.substring(0, 10) : ''),
            durationLabel: it.durationMinutes ? format(VC_Detail_Duration_Minutes, it.durationMinutes) : ''
        }));
    }

    get files() {
        return this.detail ? this.detail.files : [];
    }

    get hasFiles() {
        return this.files && this.files.length > 0;
    }

    get acceptedFormats() {
        return ['.jpg', '.jpeg', '.png', '.pdf'];
    }

    get tabPrepClass() {
        return this.activeTab === 'prep' ? 'vc-tab vc-tab_active' : 'vc-tab';
    }

    get tabExecClass() {
        return this.activeTab === 'exec' ? 'vc-tab vc-tab_active' : 'vc-tab';
    }

    get tabOutcomeClass() {
        return this.activeTab === 'outcome' ? 'vc-tab vc-tab_active' : 'vc-tab';
    }

    get isPrep() { return this.activeTab === 'prep'; }
    get isExec() { return this.activeTab === 'exec'; }
    get isOutcome() { return this.activeTab === 'outcome'; }

    get tabProgressStyle() {
        if (this.activeTab === 'prep') return 'width: 33%;';
        if (this.activeTab === 'exec') return 'width: 66%;';
        return 'width: 100%;';
    }

    handleTabPrep() { this.activeTab = 'prep'; }
    handleTabExec() { this.activeTab = 'exec'; }
    handleTabOutcome() { this.activeTab = 'outcome'; }
    handleGoToExec() { this.activeTab = 'exec'; }
    handleGoToOutcome() { this.activeTab = 'outcome'; }

    handleTranscriptChange(event) {
        this.localTranscript = event.target.value;
        this.scheduleAutosave('Voice_Transcript__c', this.localTranscript);
    }

    handleSummaryChange(event) {
        this.localSummary = event.target.value;
        this.scheduleAutosave('Visit_Summary__c', this.localSummary);
    }

    scheduleAutosave(fieldName, value) {
        clearTimeout(this.autosaveTimers[fieldName]);
        this.autosaveTimers[fieldName] = setTimeout(() => {
            saveField({ visitId: this.recordId, fieldName, value })
                .catch(e => this.toast('error', VC_Toast_SaveFailed, e.body ? e.body.message : VC_Toast_NetworkError));
        }, AUTOSAVE_DELAY);
    }

    handleRecordFieldChange() {
        refreshApex(this.wiredResult);
    }

    async handleLookupChange(event) {
        const fieldName = event.target.fieldName;
        const value = event.detail.value;
        const normalized = Array.isArray(value) ? (value[0] || null) : (value || null);
        try {
            await updateRecord({
                fields: {
                    Id: this.recordId,
                    [fieldName]: normalized
                }
            });
            await refreshApex(this.wiredResult);
        } catch (e) {
            this.toast('error', VC_Toast_SaveFailed, e.body ? e.body.message : VC_Toast_NetworkError);
        }
    }

    async handleGenerateReport() {
        this.generatingReport = true;
        try {
            const result = await regenerateReport({ visitId: this.recordId });
            if (result.success) {
                this.toast('success', VC_Toast_ReportGenerated, format(VC_Toast_ReportLanguage, result.detectedLanguage || '—'));
                await refreshApex(this.wiredResult);
                this.activeTab = 'outcome';
            } else {
                this.toast('error', VC_Toast_ReportFailed, result.errorMessage || VC_Toast_UnknownError);
            }
        } catch (e) {
            this.toast('error', VC_Common_Error, e.body ? e.body.message : VC_Toast_NetworkError);
        } finally {
            this.generatingReport = false;
        }
    }

    async handleGenerateBrief() {
        this.generatingBrief = true;
        try {
            const result = await generateBrief({ visitId: this.recordId });
            if (result.success) {
                this.toast('success', VC_Brief_Toast_Success, VC_Brief_Toast_SuccessMsg);
                await refreshApex(this.wiredResult);
            } else {
                this.toast('error', VC_Brief_Toast_Failed, result.errorMessage || VC_Toast_UnknownError);
            }
        } catch (e) {
            this.toast('error', VC_Common_Error, e.body ? e.body.message : VC_Toast_NetworkError);
        } finally {
            this.generatingBrief = false;
        }
    }

    async handleMaterializePlan() {
        this.materializingPlan = true;
        try {
            const result = await materializePlan({ visitId: this.recordId });
            if (result.success) {
                this.toast('success', VC_Toast_PlanMaterialized, format(VC_Toast_PlanResult, result.tasksCreated, result.eventsCreated));
                await refreshApex(this.wiredResult);
            } else {
                this.toast('error', VC_Toast_PlanFailed, result.errorMessage || VC_Toast_UnknownError);
            }
        } catch (e) {
            this.toast('error', VC_Common_Error, e.body ? e.body.message : VC_Toast_NetworkError);
        } finally {
            this.materializingPlan = false;
        }
    }

    async handleFileUploaded() {
        await refreshApex(this.wiredResult);
    }

    handleOpenDemoContext() {
        if (!this.demoContextId) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.demoContextId,
                objectApiName: 'Demo_Context__c',
                actionName: 'view'
            }
        });
    }

    toast(variant, title, message) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    disconnectedCallback() {
        Object.values(this.autosaveTimers).forEach(t => clearTimeout(t));
    }
}
