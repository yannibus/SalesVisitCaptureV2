import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getCapturesForEvent from '@salesforce/apex/VisitCockpitController.getCapturesForEvent';
import VC_Queue_Loading from '@salesforce/label/c.VC_Queue_Loading';
import VC_Common_Error from '@salesforce/label/c.VC_Common_Error';
import VC_EventRelated_Title from '@salesforce/label/c.VC_EventRelated_Title';
import VC_EventRelated_Empty from '@salesforce/label/c.VC_EventRelated_Empty';
import VC_Badge_ECI from '@salesforce/label/c.VC_Badge_ECI';
import VC_Badge_Manual from '@salesforce/label/c.VC_Badge_Manual';
import VC_Detail_Badge_Report_Done from '@salesforce/label/c.VC_Detail_Badge_Report_Done';
import VC_Detail_Badge_Report_Todo from '@salesforce/label/c.VC_Detail_Badge_Report_Todo';
import VC_Detail_Badge_Plan_Done from '@salesforce/label/c.VC_Detail_Badge_Plan_Done';
import VC_Detail_Badge_Plan_Pending from '@salesforce/label/c.VC_Detail_Badge_Plan_Pending';
import VC_Detail_Badge_Plan_None from '@salesforce/label/c.VC_Detail_Badge_Plan_None';
import VC_Recent_Open from '@salesforce/label/c.VC_Recent_Open';

export default class VcEventRelatedCaptures extends NavigationMixin(LightningElement) {
    @api recordId;

    captures;
    error;

    labels = {
        loading: VC_Queue_Loading,
        open: VC_Recent_Open,
        title: VC_EventRelated_Title,
        empty: VC_EventRelated_Empty
    };

    @wire(getCapturesForEvent, { eventId: '$recordId' })
    wired({ data, error }) {
        if (data) {
            this.captures = data;
            this.error = null;
        } else if (error) {
            this.error = error.body ? error.body.message : VC_Common_Error;
            this.captures = null;
        }
    }

    get hasCaptures() {
        return this.captures && this.captures.length > 0;
    }

    get rows() {
        if (!this.captures) return [];
        return this.captures.map(v => {
            const hasReport = !!v.AI_Report__c;
            const hasPlan = !!v.AI_Action_Plan__c;
            const materialized = v.Action_Plan_Materialized__c;
            return {
                id: v.Id,
                name: v.Name,
                accountName: v.Account__r ? v.Account__r.Name : '—',
                contactName: v.Contact__r ? v.Contact__r.Name : '—',
                sourceBadgeLabel: v.VideoCall__c ? VC_Badge_ECI : VC_Badge_Manual,
                sourceBadgeClass: v.VideoCall__c ? 'vc-badge vc-badge_brand' : 'vc-badge vc-badge_neutral',
                reportBadgeLabel: hasReport ? VC_Detail_Badge_Report_Done : VC_Detail_Badge_Report_Todo,
                reportBadgeClass: hasReport ? 'vc-badge vc-badge_success' : 'vc-badge vc-badge_danger',
                planBadgeLabel: materialized ? VC_Detail_Badge_Plan_Done : (hasPlan ? VC_Detail_Badge_Plan_Pending : VC_Detail_Badge_Plan_None),
                planBadgeClass: materialized ? 'vc-badge vc-badge_success' : (hasPlan ? 'vc-badge vc-badge_warning' : 'vc-badge vc-badge_neutral')
            };
        });
    }

    handleOpen(event) {
        const visitId = event.currentTarget.dataset.id;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: visitId,
                objectApiName: 'Visit_Capture__c',
                actionName: 'view'
            }
        });
    }
}
