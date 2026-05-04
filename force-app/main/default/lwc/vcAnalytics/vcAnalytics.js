import { LightningElement, api, wire } from 'lwc';
import getWeeklyVolume from '@salesforce/apex/VisitCockpitController.getWeeklyVolume';
import getSourceBreakdown from '@salesforce/apex/VisitCockpitController.getSourceBreakdown';
import getTopAccounts from '@salesforce/apex/VisitCockpitController.getTopAccounts';
import VC_Analytics_Weekly_Title from '@salesforce/label/c.VC_Analytics_Weekly_Title';
import VC_Analytics_Weekly_Total from '@salesforce/label/c.VC_Analytics_Weekly_Total';
import VC_Analytics_VisitsWord from '@salesforce/label/c.VC_Analytics_VisitsWord';
import VC_Analytics_Weekly_NoData from '@salesforce/label/c.VC_Analytics_Weekly_NoData';
import VC_Analytics_Source_Title from '@salesforce/label/c.VC_Analytics_Source_Title';
import VC_Analytics_Source_NoData from '@salesforce/label/c.VC_Analytics_Source_NoData';
import VC_Analytics_TopAccounts_Title from '@salesforce/label/c.VC_Analytics_TopAccounts_Title';
import VC_Analytics_TopAccounts_NoData from '@salesforce/label/c.VC_Analytics_TopAccounts_NoData';
import VC_Analytics_LastVisit from '@salesforce/label/c.VC_Analytics_LastVisit';
import VC_Badge_ECI from '@salesforce/label/c.VC_Badge_ECI';
import VC_Badge_Dictation from '@salesforce/label/c.VC_Badge_Dictation';
import VC_Badge_Manual from '@salesforce/label/c.VC_Badge_Manual';

const CHART_W = 320;
const CHART_H = 120;
const DONUT_R = 60;
const DONUT_INNER = 38;

export default class VcAnalytics extends LightningElement {
    @api period;
    @api refreshKey;

    weekly;
    source;
    topAccounts;
    error;

    labels = {
        weeklyTitle: VC_Analytics_Weekly_Title,
        weeklyTotal: VC_Analytics_Weekly_Total,
        visitsWord: VC_Analytics_VisitsWord,
        weeklyNoData: VC_Analytics_Weekly_NoData,
        sourceTitle: VC_Analytics_Source_Title,
        sourceNoData: VC_Analytics_Source_NoData,
        topTitle: VC_Analytics_TopAccounts_Title,
        topNoData: VC_Analytics_TopAccounts_NoData,
        lastVisit: VC_Analytics_LastVisit
    };

    @wire(getWeeklyVolume, { period: '$period' })
    wiredWeekly({ data, error }) {
        if (data) this.weekly = data;
        else if (error) this.error = 'Weekly: ' + (error.body ? error.body.message : error);
    }

    @wire(getSourceBreakdown, { period: '$period' })
    wiredSource({ data, error }) {
        if (data) this.source = data;
        else if (error) this.error = 'Source: ' + (error.body ? error.body.message : error);
    }

    @wire(getTopAccounts, { period: '$period' })
    wiredTop({ data, error }) {
        if (data) this.topAccounts = data;
        else if (error) this.error = 'Top: ' + (error.body ? error.body.message : error);
    }

    get hasWeekly() {
        return this.weekly && this.weekly.length > 0;
    }

    get sparklinePath() {
        if (!this.hasWeekly) return '';
        const pts = this.weekly;
        const max = Math.max(...pts.map(p => p.count), 1);
        const stepX = CHART_W / Math.max(pts.length - 1, 1);
        const coords = pts.map((p, i) => {
            const x = i * stepX;
            const y = CHART_H - 10 - (p.count / max) * (CHART_H - 30);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        });
        return 'M' + coords.join(' L');
    }

    get sparklineArea() {
        if (!this.hasWeekly) return '';
        const pts = this.weekly;
        const max = Math.max(...pts.map(p => p.count), 1);
        const stepX = CHART_W / Math.max(pts.length - 1, 1);
        let path = `M0,${CHART_H}`;
        pts.forEach((p, i) => {
            const x = i * stepX;
            const y = CHART_H - 10 - (p.count / max) * (CHART_H - 30);
            path += ` L${x.toFixed(1)},${y.toFixed(1)}`;
        });
        path += ` L${CHART_W},${CHART_H} Z`;
        return path;
    }

    get sparklineDots() {
        if (!this.hasWeekly) return [];
        const pts = this.weekly;
        const max = Math.max(...pts.map(p => p.count), 1);
        const stepX = CHART_W / Math.max(pts.length - 1, 1);
        return pts.map((p, i) => ({
            key: p.label + '-' + i,
            cx: (i * stepX).toFixed(1),
            cy: (CHART_H - 10 - (p.count / max) * (CHART_H - 30)).toFixed(1),
            count: p.count,
            label: p.label
        }));
    }

    get weeklyTotal() {
        if (!this.hasWeekly) return 0;
        return this.weekly.reduce((sum, p) => sum + p.count, 0);
    }

    get hasSource() {
        return this.source && (this.source.eci + this.source.dictation + this.source.manual) > 0;
    }

    get sourceTotal() {
        if (!this.source) return 0;
        return this.source.eci + this.source.dictation + this.source.manual;
    }

    get donutSegments() {
        if (!this.hasSource) return [];
        const total = this.sourceTotal;
        const segs = [
            { key: 'eci', label: VC_Badge_ECI, value: this.source.eci, color: 'var(--slds-g-color-brand-base-50, #0176d3)' },
            { key: 'dictation', label: VC_Badge_Dictation, value: this.source.dictation, color: 'var(--slds-g-color-success-1, #2e844a)' },
            { key: 'manual', label: VC_Badge_Manual, value: this.source.manual, color: 'var(--slds-g-color-neutral-30, #aeaeae)' }
        ];
        let offset = 0;
        const circumference = 2 * Math.PI * DONUT_R;
        return segs.filter(s => s.value > 0).map(s => {
            const pct = s.value / total;
            const dashLen = pct * circumference;
            const seg = {
                ...s,
                pct: Math.round(pct * 100),
                dashArray: `${dashLen.toFixed(2)} ${circumference.toFixed(2)}`,
                dashOffset: (-offset).toFixed(2),
                r: DONUT_R,
                dotStyle: `background: ${s.color};`
            };
            offset += dashLen;
            return seg;
        });
    }

    get hasTopAccounts() {
        return this.topAccounts && this.topAccounts.length > 0;
    }

    get topAccountsWithWidth() {
        if (!this.hasTopAccounts) return [];
        const maxCount = Math.max(...this.topAccounts.map(a => a.visitCount), 1);
        return this.topAccounts.map(a => ({
            ...a,
            widthStyle: `width: ${Math.round((a.visitCount / maxCount) * 100)}%;`,
            lastVisitLabel: a.lastVisitDate ? new Date(a.lastVisitDate).toLocaleDateString() : ''
        }));
    }

    get chartWidth() { return CHART_W; }
    get chartHeight() { return CHART_H; }
    get donutCx() { return 75; }
    get donutCy() { return 75; }
    get donutR() { return DONUT_R; }
    get donutInner() { return DONUT_INNER; }
}
