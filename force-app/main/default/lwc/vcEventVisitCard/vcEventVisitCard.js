import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getVisitForEvent from '@salesforce/apex/VisitCockpitController.getVisitForEvent';
import createVisitForEvent from '@salesforce/apex/VisitCockpitController.createVisitForEvent';
import generateBrief from '@salesforce/apex/VisitCockpitController.generateBrief';

import VC_EventVisit_Title from '@salesforce/label/c.VC_EventVisit_Title';
import VC_EventVisit_Empty from '@salesforce/label/c.VC_EventVisit_Empty';
import VC_EventVisit_Prepare from '@salesforce/label/c.VC_EventVisit_Prepare';
import VC_EventVisit_OpenFull from '@salesforce/label/c.VC_EventVisit_OpenFull';
import VC_EventVisit_DemoSection from '@salesforce/label/c.VC_EventVisit_DemoSection';
import VC_EventVisit_BriefSection from '@salesforce/label/c.VC_EventVisit_BriefSection';
import VC_Brief_Button_Generate from '@salesforce/label/c.VC_Brief_Button_Generate';
import VC_Brief_Button_Regenerate from '@salesforce/label/c.VC_Brief_Button_Regenerate';
import VC_Brief_Generating from '@salesforce/label/c.VC_Brief_Generating';
import VC_Brief_Empty_Hint from '@salesforce/label/c.VC_Brief_Empty_Hint';
import VC_Brief_Toast_Failed from '@salesforce/label/c.VC_Brief_Toast_Failed';
import VC_Workspace_OpenDemoContext from '@salesforce/label/c.VC_Workspace_OpenDemoContext';
import VC_Common_Error from '@salesforce/label/c.VC_Common_Error';
import VC_Queue_Loading from '@salesforce/label/c.VC_Queue_Loading';

export default class VcEventVisitCard extends NavigationMixin(LightningElement) {
    @api recordId;

    payload;
    error;
    loading = true;
    creating = false;
    generating = false;
    wiredResult;

    labels = {
        title: VC_EventVisit_Title,
        empty: VC_EventVisit_Empty,
        prepare: VC_EventVisit_Prepare,
        openFull: VC_EventVisit_OpenFull,
        demoSection: VC_EventVisit_DemoSection,
        briefSection: VC_EventVisit_BriefSection,
        generate: VC_Brief_Button_Generate,
        regenerate: VC_Brief_Button_Regenerate,
        generating: VC_Brief_Generating,
        briefEmpty: VC_Brief_Empty_Hint,
        openDemoContext: VC_Workspace_OpenDemoContext,
        loading: VC_Queue_Loading
    };

    @wire(getVisitForEvent, { eventId: '$recordId' })
    wired(result) {
        this.wiredResult = result;
        this.loading = false;
        if (result.data) {
            this.payload = result.data;
            this.error = null;
        } else if (result.error) {
            this.error = result.error.body ? result.error.body.message : VC_Common_Error;
            this.payload = null;
        }
    }

    get hasVisit() {
        return !!(this.payload && this.payload.visit);
    }

    get visit() {
        return this.payload ? this.payload.visit : null;
    }

    get hasDemoContext() {
        return !!(this.payload && this.payload.hasDemoContext);
    }

    get demoSummary() {
        if (!this.hasDemoContext) return '';
        const dc = this.visit.Demo_Context__r;
        const parts = [];
        if (dc.Account_Name__c) parts.push(dc.Account_Name__c);
        if (dc.Meeting_Type__c) parts.push(dc.Meeting_Type__c);
        if (dc.Industry__c) parts.push(dc.Industry__c);
        return parts.join(' · ');
    }

    get hasBrief() {
        return !!(this.visit && this.visit.AI_Visit_Brief__c);
    }

    get briefHtml() {
        return this.visit ? this.visit.AI_Visit_Brief__c : '';
    }

    get briefButtonLabel() {
        return this.hasBrief ? this.labels.regenerate : this.labels.generate;
    }

    handleCreate() {
        this.creating = true;
        createVisitForEvent({ eventId: this.recordId })
            .then(() => refreshApex(this.wiredResult))
            .catch(err => {
                this.error = err.body ? err.body.message : VC_Common_Error;
            })
            .finally(() => {
                this.creating = false;
            });
    }

    handleGenerateBrief() {
        if (!this.hasVisit) return;
        this.generating = true;
        generateBrief({ visitId: this.visit.Id })
            .then(res => {
                if (res && res.success) {
                    return refreshApex(this.wiredResult);
                }
                this.dispatchEvent(new ShowToastEvent({
                    title: VC_Brief_Toast_Failed,
                    message: res && res.errorMessage ? res.errorMessage : VC_Common_Error,
                    variant: 'error'
                }));
                return null;
            })
            .catch(err => {
                this.dispatchEvent(new ShowToastEvent({
                    title: VC_Brief_Toast_Failed,
                    message: err.body ? err.body.message : VC_Common_Error,
                    variant: 'error'
                }));
            })
            .finally(() => {
                this.generating = false;
            });
    }

    handleOpenDemoContext() {
        if (!this.hasDemoContext) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.visit.Demo_Context__c,
                objectApiName: 'Demo_Context__c',
                actionName: 'view'
            }
        });
    }

    handleOpenFullVisit() {
        if (!this.hasVisit) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.visit.Id,
                objectApiName: 'Visit_Capture__c',
                actionName: 'view'
            }
        });
    }
}
