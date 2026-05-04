import { LightningElement, api, wire } from 'lwc';
import getMissingReports from '@salesforce/apex/VisitCockpitController.getMissingReports';
import getMissingPlans from '@salesforce/apex/VisitCockpitController.getMissingPlans';
import VC_Common_Error from '@salesforce/label/c.VC_Common_Error';
import VC_Queue_Loading from '@salesforce/label/c.VC_Queue_Loading';
import VC_Queue_NoAccount from '@salesforce/label/c.VC_Queue_NoAccount';
import VC_Badge_ECI from '@salesforce/label/c.VC_Badge_ECI';
import VC_Badge_Manual from '@salesforce/label/c.VC_Badge_Manual';
import VC_Button_GenerateReport from '@salesforce/label/c.VC_Button_GenerateReport';
import VC_Button_CreatePlan from '@salesforce/label/c.VC_Button_CreatePlan';
import VC_Staleness_LessThanHour from '@salesforce/label/c.VC_Staleness_LessThanHour';
import VC_Staleness_HoursAgo from '@salesforce/label/c.VC_Staleness_HoursAgo';
import VC_Staleness_DaysAgo from '@salesforce/label/c.VC_Staleness_DaysAgo';
import VC_Recent_Open from '@salesforce/label/c.VC_Recent_Open';

function format(str, ...args) {
    return str.replace(/\{(\d+)\}/g, (m, i) => args[i] !== undefined ? args[i] : m);
}

export default class VcActionQueue extends LightningElement {
    @api period;
    @api refreshKey;
    @api queueType;
    @api title;
    @api emptyMessage;

    visits;
    error;
    loading = true;

    labels = {
        loading: VC_Queue_Loading,
        open: VC_Recent_Open
    };

    @wire(getMissingReports, { period: '$period' })
    wiredReports({ data, error }) {
        if (this.queueType !== 'missing-reports') return;
        this.loading = false;
        if (data) {
            this.visits = data;
            this.error = null;
        } else if (error) {
            this.error = error.body ? error.body.message : VC_Common_Error;
            this.visits = null;
        }
    }

    @wire(getMissingPlans, { period: '$period' })
    wiredPlans({ data, error }) {
        if (this.queueType !== 'missing-plans') return;
        this.loading = false;
        if (data) {
            this.visits = data;
            this.error = null;
        } else if (error) {
            this.error = error.body ? error.body.message : VC_Common_Error;
            this.visits = null;
        }
    }

    get isReports() {
        return this.queueType === 'missing-reports';
    }

    get isPlans() {
        return this.queueType === 'missing-plans';
    }

    get headerIcon() {
        return this.isReports ? 'utility:warning' : 'utility:clock';
    }

    get headerClass() {
        return this.isReports ? 'vc-queue-header vc-queue-header_danger' : 'vc-queue-header vc-queue-header_warning';
    }

    get items() {
        if (!this.visits) return [];
        return this.visits.map(v => {
            const created = new Date(v.CreatedDate);
            const hoursAgo = (Date.now() - created.getTime()) / 3600000;
            const staleness = this.describeStaleness(hoursAgo);
            return {
                id: v.Id,
                name: v.Name,
                accountName: v.Account__r ? v.Account__r.Name : VC_Queue_NoAccount,
                contactName: v.Contact__r ? v.Contact__r.Name : '',
                createdLabel: created.toLocaleDateString(),
                staleness,
                isFresh: hoursAgo < 24,
                isStale: hoursAgo >= 48,
                badgeLabel: v.VideoCall__c ? VC_Badge_ECI : VC_Badge_Manual,
                badgeClass: v.VideoCall__c ? 'vc-badge vc-badge_brand' : 'vc-badge vc-badge_neutral',
                buttonLabel: this.isReports ? VC_Button_GenerateReport : VC_Button_CreatePlan,
                buttonVariant: this.isReports ? 'brand' : 'neutral'
            };
        });
    }

    get isEmpty() {
        return !this.loading && (!this.visits || this.visits.length === 0);
    }

    get count() {
        return this.visits ? this.visits.length : 0;
    }

    describeStaleness(hours) {
        if (hours < 1) return VC_Staleness_LessThanHour;
        if (hours < 24) return format(VC_Staleness_HoursAgo, Math.round(hours));
        const days = Math.round(hours / 24);
        return format(VC_Staleness_DaysAgo, days);
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
