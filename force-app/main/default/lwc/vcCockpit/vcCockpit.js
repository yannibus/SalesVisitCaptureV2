import { LightningElement, track } from 'lwc';
import VC_Cockpit_Title from '@salesforce/label/c.VC_Cockpit_Title';
import VC_Cockpit_Subtitle from '@salesforce/label/c.VC_Cockpit_Subtitle';
import VC_Cockpit_Period from '@salesforce/label/c.VC_Cockpit_Period';
import VC_Period_Week from '@salesforce/label/c.VC_Period_Week';
import VC_Period_4Weeks from '@salesforce/label/c.VC_Period_4Weeks';
import VC_Period_Month from '@salesforce/label/c.VC_Period_Month';
import VC_Period_Quarter from '@salesforce/label/c.VC_Period_Quarter';
import VC_Queue_MissingReports_Title from '@salesforce/label/c.VC_Queue_MissingReports_Title';
import VC_Queue_MissingReports_Empty from '@salesforce/label/c.VC_Queue_MissingReports_Empty';
import VC_Queue_MissingPlans_Title from '@salesforce/label/c.VC_Queue_MissingPlans_Title';
import VC_Queue_MissingPlans_Empty from '@salesforce/label/c.VC_Queue_MissingPlans_Empty';

export default class VcCockpit extends LightningElement {
    @track period = 'month';
    @track drawerOpen = false;
    @track selectedVisitId = null;
    @track refreshKey = 0;

    labels = {
        title: VC_Cockpit_Title,
        subtitle: VC_Cockpit_Subtitle,
        period: VC_Cockpit_Period,
        missingReportsTitle: VC_Queue_MissingReports_Title,
        missingReportsEmpty: VC_Queue_MissingReports_Empty,
        missingPlansTitle: VC_Queue_MissingPlans_Title,
        missingPlansEmpty: VC_Queue_MissingPlans_Empty
    };

    get periodOptions() {
        return [
            { label: VC_Period_Week, value: 'week' },
            { label: VC_Period_4Weeks, value: '4weeks' },
            { label: VC_Period_Month, value: 'month' },
            { label: VC_Period_Quarter, value: 'quarter' }
        ];
    }

    handlePeriodChange(event) {
        this.period = event.detail.value;
    }

    handleOpenVisit(event) {
        this.selectedVisitId = event.detail.visitId;
        this.drawerOpen = true;
        requestAnimationFrame(() => {
            const el = this.template.querySelector('.vc-drawer');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    handleCloseDrawer() {
        this.drawerOpen = false;
        this.selectedVisitId = null;
    }

    handleVisitUpdated() {
        this.refreshKey += 1;
    }

    get drawerClass() {
        return this.drawerOpen
            ? 'slds-grid slds-wrap vc-layout vc-layout_drawer-open'
            : 'slds-grid slds-wrap vc-layout';
    }
}
