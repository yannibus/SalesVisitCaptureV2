import { LightningElement, api, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import getDetail from '@salesforce/apex/VisitCockpitController.getDetail';
import saveField from '@salesforce/apex/VisitCockpitController.saveField';
import regenerateReport from '@salesforce/apex/VisitCockpitController.regenerateReport';
import materializePlan from '@salesforce/apex/VisitCockpitController.materializePlan';

import VC_Queue_Loading from '@salesforce/label/c.VC_Queue_Loading';
import VC_Common_LoadError from '@salesforce/label/c.VC_Common_LoadError';
import VC_Common_Error from '@salesforce/label/c.VC_Common_Error';
import VC_Queue_NoAccount from '@salesforce/label/c.VC_Queue_NoAccount';
import VC_Badge_ECI from '@salesforce/label/c.VC_Badge_ECI';
import VC_Badge_Dictation from '@salesforce/label/c.VC_Badge_Dictation';
import VC_Badge_Manual from '@salesforce/label/c.VC_Badge_Manual';
import VC_Button_GenerateReport from '@salesforce/label/c.VC_Button_GenerateReport';
import VC_Button_RegenerateReport from '@salesforce/label/c.VC_Button_RegenerateReport';
import VC_Button_CreatePlan from '@salesforce/label/c.VC_Button_CreatePlan';
import VC_Button_RecreatePlan from '@salesforce/label/c.VC_Button_RecreatePlan';
import VC_Detail_OpenFullRecord from '@salesforce/label/c.VC_Detail_OpenFullRecord';
import VC_Detail_Close from '@salesforce/label/c.VC_Detail_Close';
import VC_Detail_Section_Inputs from '@salesforce/label/c.VC_Detail_Section_Inputs';
import VC_Detail_Grounding from '@salesforce/label/c.VC_Detail_Grounding';
import VC_Detail_NoDemoContext from '@salesforce/label/c.VC_Detail_NoDemoContext';
import VC_Detail_VideoCallLinked from '@salesforce/label/c.VC_Detail_VideoCallLinked';
import VC_Detail_EciTranscript_Label from '@salesforce/label/c.VC_Detail_EciTranscript_Label';
import VC_Detail_EciTranscript_Help from '@salesforce/label/c.VC_Detail_EciTranscript_Help';
import VC_Detail_Transcript_Label from '@salesforce/label/c.VC_Detail_Transcript_Label';
import VC_Detail_Transcript_Placeholder from '@salesforce/label/c.VC_Detail_Transcript_Placeholder';
import VC_Detail_Transcript_Help from '@salesforce/label/c.VC_Detail_Transcript_Help';
import VC_Detail_Summary_Label from '@salesforce/label/c.VC_Detail_Summary_Label';
import VC_Detail_Summary_Placeholder from '@salesforce/label/c.VC_Detail_Summary_Placeholder';
import VC_Detail_Attachments_Label from '@salesforce/label/c.VC_Detail_Attachments_Label';
import VC_Detail_Attachments_Help from '@salesforce/label/c.VC_Detail_Attachments_Help';
import VC_Detail_Section_AIActions from '@salesforce/label/c.VC_Detail_Section_AIActions';
import VC_Detail_GeneratingReport from '@salesforce/label/c.VC_Detail_GeneratingReport';
import VC_Detail_MaterializingPlan from '@salesforce/label/c.VC_Detail_MaterializingPlan';
import VC_Detail_Section_Report from '@salesforce/label/c.VC_Detail_Section_Report';
import VC_Detail_Section_Plan from '@salesforce/label/c.VC_Detail_Section_Plan';
import VC_Detail_Type_Event from '@salesforce/label/c.VC_Detail_Type_Event';
import VC_Detail_Type_Task from '@salesforce/label/c.VC_Detail_Type_Task';
import VC_Detail_Duration_Minutes from '@salesforce/label/c.VC_Detail_Duration_Minutes';
import VC_Detail_Badge_Report_Done from '@salesforce/label/c.VC_Detail_Badge_Report_Done';
import VC_Detail_Badge_Report_Todo from '@salesforce/label/c.VC_Detail_Badge_Report_Todo';
import VC_Detail_Badge_Plan_Done from '@salesforce/label/c.VC_Detail_Badge_Plan_Done';
import VC_Detail_Badge_Plan_Pending from '@salesforce/label/c.VC_Detail_Badge_Plan_Pending';
import VC_Detail_Badge_Plan_None from '@salesforce/label/c.VC_Detail_Badge_Plan_None';
import VC_Modal_RegenTitle from '@salesforce/label/c.VC_Modal_RegenTitle';
import VC_Modal_RegenBody from '@salesforce/label/c.VC_Modal_RegenBody';
import VC_Modal_RegenNote from '@salesforce/label/c.VC_Modal_RegenNote';
import VC_Modal_Cancel from '@salesforce/label/c.VC_Modal_Cancel';
import VC_Modal_ConfirmRegen from '@salesforce/label/c.VC_Modal_ConfirmRegen';
import VC_Toast_ReportGenerated from '@salesforce/label/c.VC_Toast_ReportGenerated';
import VC_Toast_ReportLanguage from '@salesforce/label/c.VC_Toast_ReportLanguage';
import VC_Toast_ReportFailed from '@salesforce/label/c.VC_Toast_ReportFailed';
import VC_Toast_PlanMaterialized from '@salesforce/label/c.VC_Toast_PlanMaterialized';
import VC_Toast_PlanResult from '@salesforce/label/c.VC_Toast_PlanResult';
import VC_Toast_PlanFailed from '@salesforce/label/c.VC_Toast_PlanFailed';
import VC_Toast_SaveFailed from '@salesforce/label/c.VC_Toast_SaveFailed';
import VC_Toast_NetworkError from '@salesforce/label/c.VC_Toast_NetworkError';
import VC_Toast_UnknownError from '@salesforce/label/c.VC_Toast_UnknownError';
import VC_Toast_FilesRejected from '@salesforce/label/c.VC_Toast_FilesRejected';
import VC_Toast_FilesRejectedMsg from '@salesforce/label/c.VC_Toast_FilesRejectedMsg';
import VC_Toast_FilesUploaded from '@salesforce/label/c.VC_Toast_FilesUploaded';
import VC_Toast_FilesUploadedMsg from '@salesforce/label/c.VC_Toast_FilesUploadedMsg';

const AUTOSAVE_DELAY = 1500;

function format(str, ...args) {
    return str.replace(/\{(\d+)\}/g, (m, i) => args[i] !== undefined ? args[i] : m);
}

export default class VcVisitDetail extends NavigationMixin(LightningElement) {
    @api visitId;

    wiredResult;
    detail;
    error;
    loading = true;
    generatingReport = false;
    materializingPlan = false;
    showConfirmModal = false;

    localTranscript = '';
    localSummary = '';
    autosaveTimers = {};

    labels = {
        loading: VC_Queue_Loading,
        openFullRecord: VC_Detail_OpenFullRecord,
        close: VC_Detail_Close,
        sectionInputs: VC_Detail_Section_Inputs,
        grounding: VC_Detail_Grounding,
        noDemoContext: VC_Detail_NoDemoContext,
        videoCallLinked: VC_Detail_VideoCallLinked,
        eciTranscriptLabel: VC_Detail_EciTranscript_Label,
        eciTranscriptHelp: VC_Detail_EciTranscript_Help,
        transcriptLabel: VC_Detail_Transcript_Label,
        transcriptPlaceholder: VC_Detail_Transcript_Placeholder,
        transcriptHelp: VC_Detail_Transcript_Help,
        summaryLabel: VC_Detail_Summary_Label,
        summaryPlaceholder: VC_Detail_Summary_Placeholder,
        attachmentsLabel: VC_Detail_Attachments_Label,
        attachmentsHelp: VC_Detail_Attachments_Help,
        sectionAI: VC_Detail_Section_AIActions,
        generatingReport: VC_Detail_GeneratingReport,
        materializingPlan: VC_Detail_MaterializingPlan,
        sectionReport: VC_Detail_Section_Report,
        sectionPlan: VC_Detail_Section_Plan,
        modalRegenTitle: VC_Modal_RegenTitle,
        modalRegenBody: VC_Modal_RegenBody,
        modalRegenNote: VC_Modal_RegenNote,
        modalCancel: VC_Modal_Cancel,
        modalConfirm: VC_Modal_ConfirmRegen
    };

    @wire(getDetail, { visitId: '$visitId' })
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

    get hasReport() {
        return this.visit && this.visit.AI_Report__c;
    }

    get hasPlan() {
        return this.visit && this.visit.AI_Action_Plan__c;
    }

    get isMaterialized() {
        return this.visit && this.visit.Action_Plan_Materialized__c;
    }

    get hasVideoCall() {
        return this.visit && this.visit.VideoCall__c;
    }

    get eciTranscript() {
        return this.detail ? this.detail.eciTranscript : '';
    }

    get hasEciTranscript() {
        return !!(this.detail && this.detail.eciTranscript);
    }

    get hasDemoContext() {
        return this.detail && this.detail.hasDemoContext;
    }

    get accountName() {
        return this.visit && this.visit.Account__r ? this.visit.Account__r.Name : VC_Queue_NoAccount;
    }

    get contactName() {
        return this.visit && this.visit.Contact__r ? this.visit.Contact__r.Name : '';
    }

    get demoContextLabel() {
        if (!this.detail || !this.detail.hasDemoContext) return '';
        const dc = this.visit.Demo_Context__r;
        return dc ? `${dc.Account_Name__c} — ${dc.Meeting_Type__c}` : '';
    }

    get sourceBadgeLabel() {
        if (this.hasVideoCall) return VC_Badge_ECI;
        if (this.localTranscript) return VC_Badge_Dictation;
        return VC_Badge_Manual;
    }

    get sourceBadgeClass() {
        if (this.hasVideoCall) return 'vc-badge vc-badge_brand';
        if (this.localTranscript) return 'vc-badge vc-badge_success';
        return 'vc-badge vc-badge_neutral';
    }

    get reportBadgeClass() {
        return this.hasReport ? 'vc-badge vc-badge_success' : 'vc-badge vc-badge_danger';
    }

    get reportBadgeLabel() {
        return this.hasReport ? VC_Detail_Badge_Report_Done : VC_Detail_Badge_Report_Todo;
    }

    get planBadgeClass() {
        if (this.isMaterialized) return 'vc-badge vc-badge_success';
        if (this.hasPlan) return 'vc-badge vc-badge_warning';
        return 'vc-badge vc-badge_neutral';
    }

    get planBadgeLabel() {
        if (this.isMaterialized) return VC_Detail_Badge_Plan_Done;
        if (this.hasPlan) return VC_Detail_Badge_Plan_Pending;
        return VC_Detail_Badge_Plan_None;
    }

    get reportButtonLabel() {
        return this.hasReport ? VC_Button_RegenerateReport : VC_Button_GenerateReport;
    }

    get reportButtonVariant() {
        return 'brand';
    }

    get planButtonLabel() {
        return this.isMaterialized ? VC_Button_RecreatePlan : VC_Button_CreatePlan;
    }

    get planButtonDisabled() {
        return !this.hasPlan || this.materializingPlan;
    }

    get actionPlanItems() {
        if (!this.detail) return [];
        return this.detail.actionPlanItems.map((it, i) => ({
            key: i,
            ...it,
            typeLabel: it.type === 'event' ? VC_Detail_Type_Event : VC_Detail_Type_Task,
            typeBadgeClass: it.type === 'event' ? 'vc-badge vc-badge_brand' : 'vc-badge vc-badge_success',
            priorityBadgeClass: it.priority === 'high' ? 'vc-priority-badge vc-priority-badge_high' : (it.priority === 'low' ? 'vc-priority-badge vc-priority-badge_low' : 'vc-priority-badge vc-priority-badge_normal'),
            priorityLabel: it.priority ? it.priority.toUpperCase() : '',
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

    get recordId() {
        return this.visitId;
    }

    get reportPreviewHtml() {
        return this.visit && this.visit.AI_Report__c ? this.visit.AI_Report__c : '';
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

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
            saveField({ visitId: this.visitId, fieldName, value })
                .catch(e => {
                    this.toast('error', VC_Toast_SaveFailed, e.body ? e.body.message : VC_Toast_NetworkError);
                });
        }, AUTOSAVE_DELAY);
    }

    handleGenerateReport() {
        if (this.hasReport) {
            this.showConfirmModal = true;
        } else {
            this.doGenerateReport();
        }
    }

    handleCancelConfirm() {
        this.showConfirmModal = false;
    }

    handleConfirmRegen() {
        this.showConfirmModal = false;
        this.doGenerateReport();
    }

    async doGenerateReport() {
        this.generatingReport = true;
        try {
            const result = await regenerateReport({ visitId: this.visitId });
            if (result.success) {
                this.toast('success', VC_Toast_ReportGenerated, format(VC_Toast_ReportLanguage, result.detectedLanguage || '—'));
                await refreshApex(this.wiredResult);
                this.dispatchEvent(new CustomEvent('visitupdated', { bubbles: true, composed: true }));
            } else {
                this.toast('error', VC_Toast_ReportFailed, result.errorMessage || VC_Toast_UnknownError);
            }
        } catch (e) {
            this.toast('error', VC_Common_Error, e.body ? e.body.message : VC_Toast_NetworkError);
        } finally {
            this.generatingReport = false;
        }
    }

    async handleMaterializePlan() {
        this.materializingPlan = true;
        try {
            const result = await materializePlan({ visitId: this.visitId });
            if (result.success) {
                this.toast('success', VC_Toast_PlanMaterialized, format(VC_Toast_PlanResult, result.tasksCreated, result.eventsCreated));
                await refreshApex(this.wiredResult);
                this.dispatchEvent(new CustomEvent('visitupdated', { bubbles: true, composed: true }));
            } else {
                this.toast('error', VC_Toast_PlanFailed, result.errorMessage || VC_Toast_UnknownError);
            }
        } catch (e) {
            this.toast('error', VC_Common_Error, e.body ? e.body.message : VC_Toast_NetworkError);
        } finally {
            this.materializingPlan = false;
        }
    }

    async handleFileUploaded(event) {
        const uploaded = event.detail.files;
        const valid = uploaded.filter(f => this.validateFile(f));
        if (valid.length < uploaded.length) {
            this.toast('warning', VC_Toast_FilesRejected, VC_Toast_FilesRejectedMsg);
        }
        if (valid.length > 0) {
            this.toast('success', VC_Toast_FilesUploaded, format(VC_Toast_FilesUploadedMsg, valid.length));
            await refreshApex(this.wiredResult);
        }
    }

    validateFile(file) {
        if (file.contentSize && file.contentSize > 5 * 1024 * 1024) return false;
        const name = (file.name || '').toLowerCase();
        return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.pdf');
    }

    handleOpenFullRecord() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.visitId,
                objectApiName: 'Visit_Capture__c',
                actionName: 'view'
            }
        });
    }

    handleOpenDemoContext() {
        if (!this.visit || !this.visit.Demo_Context__c) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.visit.Demo_Context__c,
                objectApiName: 'Demo_Context__c',
                actionName: 'view'
            }
        });
    }

    handleOpenVideoCall() {
        if (!this.hasVideoCall) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.visit.VideoCall__c,
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
