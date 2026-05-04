import { LightningElement, api, wire } from 'lwc';
import getRecentVisits from '@salesforce/apex/VisitCockpitController.getRecentVisits';
import VC_Common_Error from '@salesforce/label/c.VC_Common_Error';
import VC_Badge_ECI from '@salesforce/label/c.VC_Badge_ECI';
import VC_Badge_Dictation from '@salesforce/label/c.VC_Badge_Dictation';
import VC_Badge_Manual from '@salesforce/label/c.VC_Badge_Manual';
import VC_Recent_ReportDone from '@salesforce/label/c.VC_Recent_ReportDone';
import VC_Recent_ReportPending from '@salesforce/label/c.VC_Recent_ReportPending';
import VC_Recent_PlanMaterialized from '@salesforce/label/c.VC_Recent_PlanMaterialized';
import VC_Recent_PlanPending from '@salesforce/label/c.VC_Recent_PlanPending';
import VC_Recent_PlanNone from '@salesforce/label/c.VC_Recent_PlanNone';
import VC_Recent_Title from '@salesforce/label/c.VC_Recent_Title';
import VC_Recent_Subtitle from '@salesforce/label/c.VC_Recent_Subtitle';
import VC_Recent_Col_Date from '@salesforce/label/c.VC_Recent_Col_Date';
import VC_Recent_Col_Account from '@salesforce/label/c.VC_Recent_Col_Account';
import VC_Recent_Col_Contact from '@salesforce/label/c.VC_Recent_Col_Contact';
import VC_Recent_Col_Source from '@salesforce/label/c.VC_Recent_Col_Source';
import VC_Recent_Col_Report from '@salesforce/label/c.VC_Recent_Col_Report';
import VC_Recent_Col_Plan from '@salesforce/label/c.VC_Recent_Col_Plan';
import VC_Recent_Col_Language from '@salesforce/label/c.VC_Recent_Col_Language';
import VC_Recent_Open from '@salesforce/label/c.VC_Recent_Open';
import VC_Recent_Empty from '@salesforce/label/c.VC_Recent_Empty';

export default class VcRecentVisits extends LightningElement {
    @api period;
    @api refreshKey;

    visits;
    error;

    labels = {
        title: VC_Recent_Title,
        subtitle: VC_Recent_Subtitle,
        colDate: VC_Recent_Col_Date,
        colAccount: VC_Recent_Col_Account,
        colContact: VC_Recent_Col_Contact,
        colSource: VC_Recent_Col_Source,
        colReport: VC_Recent_Col_Report,
        colPlan: VC_Recent_Col_Plan,
        colLanguage: VC_Recent_Col_Language,
        open: VC_Recent_Open,
        empty: VC_Recent_Empty
    };

    @wire(getRecentVisits, { period: '$period', maxRows: 10 })
    wiredVisits({ data, error }) {
        if (data) {
            this.visits = data;
            this.error = null;
        } else if (error) {
            this.error = error.body ? error.body.message : VC_Common_Error;
            this.visits = null;
        }
    }

    get hasVisits() {
        return this.visits && this.visits.length > 0;
    }

    get rows() {
        if (!this.visits) return [];
        return this.visits.map(v => {
            const hasReport = !!v.AI_Report__c;
            const hasPlan = !!v.AI_Action_Plan__c;
            const materialized = v.Action_Plan_Materialized__c;
            let source;
            if (v.VideoCall__c) source = VC_Badge_ECI;
            else if (v.Voice_Transcript__c) source = VC_Badge_Dictation;
            else source = VC_Badge_Manual;
            return {
                id: v.Id,
                name: v.Name,
                accountName: v.Account__r ? v.Account__r.Name : '—',
                contactName: v.Contact__r ? v.Contact__r.Name : '—',
                dateLabel: new Date(v.CreatedDate).toLocaleDateString(),
                source,
                sourceBadgeClass: source === VC_Badge_ECI ? 'vc-badge vc-badge_brand' : (source === VC_Badge_Dictation ? 'vc-badge vc-badge_success' : 'vc-badge vc-badge_neutral'),
                reportStatus: hasReport ? '✓' : '⏳',
                reportBadgeClass: hasReport ? 'vc-status vc-status_success' : 'vc-status vc-status_danger',
                reportLabel: hasReport ? VC_Recent_ReportDone : VC_Recent_ReportPending,
                planStatus: materialized ? '✓' : (hasPlan ? '⏳' : '—'),
                planBadgeClass: materialized ? 'vc-status vc-status_success' : (hasPlan ? 'vc-status vc-status_warning' : 'vc-status vc-status_neutral'),
                planLabel: materialized ? VC_Recent_PlanMaterialized : (hasPlan ? VC_Recent_PlanPending : VC_Recent_PlanNone),
                language: v.Detected_Language__c || '—'
            };
        });
    }

    handleOpen(event) {
        const visitId = event.currentTarget.dataset.id;
        this.dispatchEvent(new CustomEvent('openvisit', {
            detail: { visitId },
            bubbles: true,
            composed: true
        }));
    }
}
