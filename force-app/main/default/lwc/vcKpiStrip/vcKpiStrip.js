import { LightningElement, api, wire } from 'lwc';
import getSummary from '@salesforce/apex/VisitCockpitController.getSummary';
import VC_Common_LoadError from '@salesforce/label/c.VC_Common_LoadError';
import VC_Kpi_TotalVisits from '@salesforce/label/c.VC_Kpi_TotalVisits';
import VC_Kpi_TotalVisits_Desc from '@salesforce/label/c.VC_Kpi_TotalVisits_Desc';
import VC_Kpi_MissingReports from '@salesforce/label/c.VC_Kpi_MissingReports';
import VC_Kpi_MissingReports_Some from '@salesforce/label/c.VC_Kpi_MissingReports_Some';
import VC_Kpi_MissingReports_None from '@salesforce/label/c.VC_Kpi_MissingReports_None';
import VC_Kpi_MissingPlans from '@salesforce/label/c.VC_Kpi_MissingPlans';
import VC_Kpi_MissingPlans_Some from '@salesforce/label/c.VC_Kpi_MissingPlans_Some';
import VC_Kpi_MissingPlans_None from '@salesforce/label/c.VC_Kpi_MissingPlans_None';
import VC_Kpi_TasksEvents from '@salesforce/label/c.VC_Kpi_TasksEvents';
import VC_Kpi_TasksEvents_Desc from '@salesforce/label/c.VC_Kpi_TasksEvents_Desc';
import VC_Kpi_Eci from '@salesforce/label/c.VC_Kpi_Eci';
import VC_Kpi_Eci_Desc from '@salesforce/label/c.VC_Kpi_Eci_Desc';
import VC_Kpi_Manual from '@salesforce/label/c.VC_Kpi_Manual';
import VC_Kpi_Manual_Desc from '@salesforce/label/c.VC_Kpi_Manual_Desc';
import VC_Kpi_DeltaNew from '@salesforce/label/c.VC_Kpi_DeltaNew';
import VC_Kpi_DeltaVsPrevious from '@salesforce/label/c.VC_Kpi_DeltaVsPrevious';
import VC_Kpi_DeltaUp from '@salesforce/label/c.VC_Kpi_DeltaUp';
import VC_Kpi_DeltaDown from '@salesforce/label/c.VC_Kpi_DeltaDown';

function format(str, ...args) {
    return str.replace(/\{(\d+)\}/g, (m, i) => args[i] !== undefined ? args[i] : m);
}

export default class VcKpiStrip extends LightningElement {
    @api period;
    @api refreshKey;

    summary;
    error;
    loading = true;

    labels = {
        deltaUp: VC_Kpi_DeltaUp,
        deltaDown: VC_Kpi_DeltaDown
    };

    @wire(getSummary, { period: '$period' })
    wiredSummary({ data, error }) {
        this.loading = false;
        if (data) {
            this.summary = data;
            this.error = null;
        } else if (error) {
            this.error = error.body ? error.body.message : VC_Common_LoadError;
            this.summary = null;
        }
    }

    get kpis() {
        if (!this.summary) return [];
        const s = this.summary;
        const raw = [
            {
                key: 'total',
                label: VC_Kpi_TotalVisits,
                value: s.totalVisits,
                delta: this.calcDelta(s.totalVisits, s.totalVisitsPrevious),
                tone: 'neutral',
                description: VC_Kpi_TotalVisits_Desc
            },
            {
                key: 'missing-reports',
                label: VC_Kpi_MissingReports,
                value: s.missingReports,
                delta: null,
                tone: s.missingReports > 0 ? 'danger' : 'success',
                description: s.missingReports > 0 ? VC_Kpi_MissingReports_Some : VC_Kpi_MissingReports_None
            },
            {
                key: 'missing-plans',
                label: VC_Kpi_MissingPlans,
                value: s.reportsWithoutPlan,
                delta: null,
                tone: s.reportsWithoutPlan > 0 ? 'warning' : 'success',
                description: s.reportsWithoutPlan > 0 ? VC_Kpi_MissingPlans_Some : VC_Kpi_MissingPlans_None
            },
            {
                key: 'tasks-events',
                label: VC_Kpi_TasksEvents,
                value: s.tasksCreated + s.eventsCreated,
                delta: null,
                tone: 'success',
                description: format(VC_Kpi_TasksEvents_Desc, s.tasksCreated, s.eventsCreated)
            },
            {
                key: 'eci',
                label: VC_Kpi_Eci,
                value: s.eciCaptured,
                delta: this.calcDelta(s.eciCaptured, s.eciCapturedPrevious),
                tone: 'brand',
                description: VC_Kpi_Eci_Desc
            },
            {
                key: 'manual',
                label: VC_Kpi_Manual,
                value: s.manualCaptured,
                delta: null,
                tone: 'neutral',
                description: VC_Kpi_Manual_Desc
            }
        ];
        return raw.map(k => this.enrichKpi(k));
    }

    enrichKpi(k) {
        const direction = k.delta ? k.delta.direction : 'flat';
        return {
            ...k,
            cardClass: 'vc-kpi-card',
            deltaClass: `vc-kpi-delta vc-kpi-delta_${direction}`,
            deltaUp: direction === 'up',
            deltaDown: direction === 'down'
        };
    }

    get skeletons() {
        return [1, 2, 3, 4, 5, 6];
    }

    calcDelta(current, previous) {
        if (previous === null || previous === undefined) return null;
        if (previous === 0) {
            return current > 0 ? { pct: null, direction: 'up', label: VC_Kpi_DeltaNew } : null;
        }
        const diff = current - previous;
        const pct = Math.round((diff / previous) * 100);
        const signed = `${pct > 0 ? '+' : ''}${pct}`;
        return {
            pct: Math.abs(pct),
            direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
            label: format(VC_Kpi_DeltaVsPrevious, signed)
        };
    }
}
