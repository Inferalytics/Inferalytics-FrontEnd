/**
 * WorldModelCanvasTree
 * IPS Engine–style canvas with dashboard-style modals (KPIs + charts + tables).
 * Modal uses React Portal to escape CSS-transform stacking context.
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell,
} from 'recharts';
import { directBezier } from '../layout/panels/bezierUtils';
import type { WorldModelTreeType, MacroCategory, TreeCategory, DataPoint } from '../../types/api';

// ── Theme ─────────────────────────────────────────────────────────────────────
const ACCENT = { root: '#FF5A1F', macro: '#8EA885', cat: '#EA580C' };
const GREEN  = '#16A34A';
const RED    = '#EF4444';

// ── Canvas constants ──────────────────────────────────────────────────────────
const CW = 220, CH = 122, VG = 20, MG = 40, COL = 280;

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt   = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const parseP = (s: string) => parseFloat(s.replace(/[+%\s]/g, ''));
const dHex  = (d: number) => d >= 0 ? GREEN : RED;
const dCls  = (d: number) => d >= 0 ? 'text-green-600' : 'text-red-500';

function DeltaIcon({ d }: { d: number }) {
  if (d > 0) return <TrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />;
  if (d < 0) return <TrendingDown className="h-3.5 w-3.5 text-red-400 shrink-0" />;
  return <Minus className="h-3.5 w-3.5 text-warm-muted shrink-0" />;
}

// ── Canvas layout ─────────────────────────────────────────────────────────────
const macroId = (l: string) => `macro__${l}`;
const catId   = (ml: string, cl: string) => `cat__${ml}__${cl}`;

function computeLayout(tree: WorldModelTreeType) {
  const pos: Record<string, { x: number; y: number }> = {};
  const conns: { fromId: string; toId: string }[]      = [];
  let catY = 0;
  tree.macro_categories.forEach(macro => {
    const start = catY;
    macro.categories.forEach(cat => {
      const id = catId(macro.label, cat.label);
      pos[id] = { x: COL * 2 + 20, y: catY };
      conns.push({ fromId: macroId(macro.label), toId: id });
      catY += CH + VG;
    });
    const groupH = macro.categories.length * (CH + VG) - VG;
    pos[macroId(macro.label)] = { x: COL + 20, y: start + groupH / 2 - CH / 2 };
    conns.push({ fromId: 'root', toId: macroId(macro.label) });
    catY += MG;
  });
  const ys   = tree.macro_categories.map(m => pos[macroId(m.label)].y);
  pos['root'] = { x: 20, y: (Math.min(...ys) + Math.max(...ys) + CH) / 2 - CH / 2 };
  return { pos, conns, canvasH: Math.max(560, catY + CH + 40) };
}

// ── Recharts custom tooltip ────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-warm-border rounded-xl px-3 py-2 shadow-xl text-[11px]">
      <div className="font-bold text-warm-text mb-1 max-w-[160px] truncate">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-warm-muted">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{
            typeof p.value === 'number' ? p.value.toLocaleString('en-US', { maximumFractionDigits: 4 }) : p.value
          }</span>
        </div>
      ))}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent, large }: {
  label: string; value: string; sub?: string; accent?: string; large?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4 bg-white border border-warm-border/50 rounded-2xl">
      <div className="text-[10px] text-warm-muted font-semibold uppercase tracking-wider">{label}</div>
      <div className={`font-black leading-none ${large ? 'text-[28px]' : 'text-[22px]'}`}
        style={{ color: accent ?? '#2C2B29' }}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-warm-muted mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHead({ title }: { title: string }) {
  return <div className="text-[12px] font-bold text-warm-text mb-3">{title}</div>;
}

// ── Modal types ───────────────────────────────────────────────────────────────
type ModalData =
  | { type: 'root';  tree: WorldModelTreeType }
  | { type: 'macro'; macro: MacroCategory; macroField: string; catField: string }
  | { type: 'cat';   macro: MacroCategory; cat: TreeCategory; macroField: string; catField: string };

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ data, onClose }: { data: ModalData; onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  // ── Root body ──────────────────────────────────────────────────────────────
  function RootBody({ tree }: { tree: WorldModelTreeType }) {
    const ranking = tree.relationships.macro_growth_ranking;
    const barData = ranking.map(m => ({
      name: m.label.length > 14 ? m.label.slice(0, 13) + '…' : m.label,
      fullName: m.label,
      egr: parseP(m.egr_contribution_pct),
      raw: m.egr_contribution_pct,
      color: dHex(m.delta),
    }));

    // area: original vs final per group
    const areaData = ranking.map(m => ({
      name: m.label.length > 12 ? m.label.slice(0, 11) + '…' : m.label,
      Original: m.original_value,
      Final:    m.final_value,
    }));

    return (
      <div className="flex flex-col gap-6">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-3">
          <KpiCard label="Target EGR"    value={tree.target_egr_pct} accent={ACCENT.root} large />
          <KpiCard label="Achieved EGR"  value={tree.final_egr_pct}
            accent={tree.converged ? GREEN : '#D97706'}
            sub={tree.converged ? '✓ Converged' : '⚠ Pending'} large />
          <KpiCard label="Total Change"  value={tree.total_change_pct} accent={dHex(tree.total_delta)}
            sub={`${fmt(tree.original_total)} → ${fmt(tree.final_total)}`} />
          <KpiCard label="Groups"        value={String(tree.macro_categories.length)}
            sub={`${ranking.filter(m => m.role === 'driver').length} drivers`} />
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* EGR Contribution per group */}
          <div className="bg-white border border-warm-border/40 rounded-2xl p-4">
            <SectionHead title="EGR Contribution by Group" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EFECE8" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#7E7770' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#2C2B29', fontWeight: 600 }}
                  width={90} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="egr" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 9, fill: '#7E7770',
                  formatter: ((_: any, entry: any) => entry?.payload?.raw ?? '') as any }}>
                  {barData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Original vs Final per group */}
          <div className="bg-white border border-warm-border/40 rounded-2xl p-4">
            <SectionHead title="Original vs Final by Group" />
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={areaData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gOrig" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#EFECE8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#EFECE8" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="gFinal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={ACCENT.root} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={ACCENT.root} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE8" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#7E7770' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#7E7770' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Original" stroke="#C8C3BC" fill="url(#gOrig)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="Final"    stroke={ACCENT.root} fill="url(#gFinal)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ranked table */}
        <div className="bg-white border border-warm-border/40 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-warm-border/30">
            <SectionHead title="Group Rankings" />
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-warm-border/20">
                {['#', 'Group', 'EGR Contribution', 'Change %', 'Original', 'Final', 'Role'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[9px] font-bold text-warm-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map((m, i) => (
                <tr key={m.label} className={i % 2 === 0 ? 'bg-warm-bg/40' : 'bg-white'}>
                  <td className="px-3 py-2 text-warm-muted font-mono">{i + 1}</td>
                  <td className="px-3 py-2 font-semibold text-warm-text">{m.label}</td>
                  <td className="px-3 py-2 font-black" style={{ color: dHex(m.delta) }}>{m.egr_contribution_pct}</td>
                  <td className="px-3 py-2 font-semibold" style={{ color: dHex(m.delta) }}>{m.change_pct}</td>
                  <td className="px-3 py-2 text-warm-muted font-mono">{fmt(m.original_value ?? 0)}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-warm-text">{fmt(m.final_value ?? 0)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase border ${
                      m.role === 'driver' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-400 border-red-100'
                    }`}>{m.role}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Macro body ─────────────────────────────────────────────────────────────
  function MacroBody({ macro, catField }: { macro: MacroCategory; catField: string }) {
    const barData = macro.categories.map(c => ({
      name: c.label.length > 14 ? c.label.slice(0, 13) + '…' : c.label,
      egr:  parseP(c.egr_contribution_pct),
      raw:  c.egr_contribution_pct,
      color: dHex(c.delta),
    }));

    const areaData = macro.categories.map(c => ({
      name:     c.label.length > 10 ? c.label.slice(0, 9) + '…' : c.label,
      Original: c.original_value,
      Final:    c.final_value,
    }));

    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-4 gap-3">
          <KpiCard label="EGR Contribution" value={macro.egr_contribution_pct} accent={dHex(macro.delta)} large />
          <KpiCard label="Change"           value={macro.change_pct}           accent={dHex(macro.delta)} large />
          <KpiCard label="Original"         value={fmt(macro.original_value)}  sub="before optimization" />
          <KpiCard label="Final"            value={fmt(macro.final_value)}     sub="after optimization" accent={dHex(macro.delta)} />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white border border-warm-border/40 rounded-2xl p-4">
            <SectionHead title={`EGR by ${catField}`} />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EFECE8" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#7E7770' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#2C2B29', fontWeight: 600 }}
                  width={90} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="egr" radius={[0, 4, 4, 0]}
                  label={{ position: 'right', fontSize: 9, fill: '#7E7770',
                    formatter: ((_: any, entry: any) => entry?.payload?.raw ?? '') as any }}>
                  {barData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-warm-border/40 rounded-2xl p-4">
            <SectionHead title="Original vs Final" />
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={areaData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mOrig" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#EFECE8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#EFECE8" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="mFinal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={ACCENT.macro} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={ACCENT.macro} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE8" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#7E7770' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#7E7770' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Original" stroke="#C8C3BC" fill="url(#mOrig)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="Final"    stroke={ACCENT.macro} fill="url(#mFinal)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category table */}
        <div className="bg-white border border-warm-border/40 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-warm-border/30">
            <SectionHead title={`${catField} Breakdown`} />
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-warm-border/20">
                {['#', catField, 'EGR %', 'Change', 'Original', 'Final', 'Pts'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[9px] font-bold text-warm-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {macro.categories.map((c, i) => (
                <tr key={c.label} className={i % 2 === 0 ? 'bg-warm-bg/40' : 'bg-white'}>
                  <td className="px-3 py-2 text-warm-muted font-mono">{i + 1}</td>
                  <td className="px-3 py-2 font-semibold text-warm-text">{c.label}</td>
                  <td className="px-3 py-2 font-black" style={{ color: dHex(c.delta) }}>{c.egr_contribution_pct}</td>
                  <td className="px-3 py-2 font-semibold" style={{ color: dHex(c.delta) }}>{c.change_pct}</td>
                  <td className="px-3 py-2 text-warm-muted font-mono">{fmt(c.original_value)}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-warm-text">{fmt(c.final_value)}</td>
                  <td className="px-3 py-2 text-warm-muted">{c.data_points_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Category body ──────────────────────────────────────────────────────────
  function CatBody({ cat }: { cat: TreeCategory }) {
    const sorted = [...cat.data_points].sort(
      (a, b) => Math.abs(parseP(b.egr_contribution_pct)) - Math.abs(parseP(a.egr_contribution_pct))
    );
    const top10 = sorted.slice(0, 10);

    const barData = top10.map(dp => ({
      name:  dp.label.length > 16 ? dp.label.slice(0, 15) + '…' : dp.label,
      egr:   parseP(dp.egr_contribution_pct),
      raw:   dp.egr_contribution_pct,
      color: dHex(dp.delta),
    }));

    const areaData = top10.map(dp => ({
      name:     dp.label.split('|').pop()?.trim() ?? dp.label,
      Original: dp.original_value,
      Final:    dp.final_value,
    }));

    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-4 gap-3">
          <KpiCard label="EGR Contribution" value={cat.egr_contribution_pct} accent={dHex(cat.delta)} large />
          <KpiCard label="Change"           value={cat.change_pct}           accent={dHex(cat.delta)} large />
          <KpiCard label="Original"         value={fmt(cat.original_value)}  sub="before" />
          <KpiCard label="Final"            value={fmt(cat.final_value)}     accent={dHex(cat.delta)} sub="after" />
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* EGR contribution bar chart */}
          <div className="bg-white border border-warm-border/40 rounded-2xl p-4">
            <SectionHead title="EGR Contribution (Top 10)" />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EFECE8" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#7E7770' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(3)}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#2C2B29' }}
                  width={100} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="egr" radius={[0, 4, 4, 0]}
                  label={{ position: 'right', fontSize: 9, fill: '#7E7770',
                    formatter: ((_: any, entry: any) => entry?.payload?.raw ?? '') as any }}>
                  {barData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Original vs Final area chart */}
          <div className="bg-white border border-warm-border/40 rounded-2xl p-4">
            <SectionHead title="Original vs Final (Top 10)" />
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={areaData} margin={{ top: 4, right: 8, left: 0, bottom: 24 }}>
                <defs>
                  <linearGradient id="cOrig" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#EFECE8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#EFECE8" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="cFinal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={ACCENT.cat} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={ACCENT.cat} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE8" />
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#7E7770' }} axisLine={false} tickLine={false}
                  angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 9, fill: '#7E7770' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Original" stroke="#C8C3BC" fill="url(#cOrig)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="Final"    stroke={ACCENT.cat} fill="url(#cFinal)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Full data point table */}
        <div className="bg-white border border-warm-border/40 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-warm-border/30">
            <SectionHead title={`All Data Points (${cat.data_points_count})`} />
          </div>
          <div className="max-h-[220px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-warm-bg/90">
                <tr className="border-b border-warm-border/20">
                  {['#', 'Data Point', 'EGR %', 'Change', 'Original', 'Final'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9px] font-bold text-warm-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((dp, i) => {
                  const isFixed = dp.status === 'fixed';
                  return (
                    <tr key={dp.vector_index}
                      className={`border-b border-warm-border/10 ${isFixed ? 'opacity-40' : ''} ${i % 2 === 0 ? 'bg-warm-bg/30' : 'bg-white'}`}>
                      <td className="px-3 py-1.5 text-warm-muted font-mono">{i + 1}</td>
                      <td className="px-3 py-1.5 font-semibold text-warm-text max-w-[200px] truncate">
                        <div className="flex items-center gap-1.5">
                          <DeltaIcon d={dp.delta} />
                          <span className="truncate">{dp.label}</span>
                          {isFixed && <span className="text-[8px] px-1 rounded bg-warm-muted/20 text-warm-muted shrink-0">fixed</span>}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 font-black" style={{ color: dHex(dp.delta) }}>{dp.egr_contribution_pct}</td>
                      <td className="px-3 py-1.5 font-semibold" style={{ color: dHex(dp.delta) }}>{dp.change_pct}</td>
                      <td className="px-3 py-1.5 text-warm-muted font-mono">{fmt(dp.original_value)}</td>
                      <td className="px-3 py-1.5 font-mono font-semibold text-warm-text">{fmt(dp.final_value)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  let title = '', subtitle = '', accent = ACCENT.root, body: React.ReactNode = null;
  if (data.type === 'root') {
    title    = data.tree.label;
    subtitle = `EGR Optimization · ${data.tree.macro_categories.length} groups`;
    accent   = ACCENT.root;
    body     = <RootBody tree={data.tree} />;
  } else if (data.type === 'macro') {
    title    = data.macro.label;
    subtitle = `${data.macroField} · ${data.macro.categories_count} ${data.catField.toLowerCase()} groups`;
    accent   = ACCENT.macro;
    body     = <MacroBody macro={data.macro} catField={data.catField} />;
  } else if (data.type === 'cat') {
    title    = `${data.macro.label} · ${data.cat.label}`;
    subtitle = `${data.catField} · ${data.cat.data_points_count} data points`;
    accent   = ACCENT.cat;
    body     = <CatBody cat={data.cat} />;
  }

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.52)' }}
      onMouseDown={e => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="relative bg-warm-bg w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-warm-border/50"
        onClick={e => e.stopPropagation()}
      >
        {/* Accent stripe */}
        <div className="h-[3px] shrink-0" style={{ backgroundColor: accent }} />

        {/* Header */}
        <div className="shrink-0 px-6 py-4 bg-white border-b border-warm-border/40 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[16px] font-black text-warm-text leading-tight truncate">{title}</div>
            <div className="text-[11px] text-warm-muted mt-0.5">{subtitle}</div>
          </div>
          <button onClick={onClose}
            className="shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-warm-muted hover:text-warm-text hover:bg-warm-border/40 transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {body}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Canvas card components ────────────────────────────────────────────────────
function RootCard({ tree }: { tree: WorldModelTreeType }) {
  return (
    <div className="w-full h-full flex flex-col justify-between p-3 select-none">
      <div>
        <div className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: `${ACCENT.root}99` }}>EGR Root</div>
        <div className="text-[13px] font-black text-warm-text leading-tight">{tree.label}</div>
      </div>
      <div>
        <div className="mb-1.5">
          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase"
            style={{ backgroundColor: `${ACCENT.root}15`, color: ACCENT.root }}>NUMERIC</span>
        </div>
        <div className="flex items-center gap-2">
          <div><div className="text-[8px] text-warm-muted">Target</div>
            <div className="text-[16px] font-black text-warm-text">{tree.target_egr_pct}</div></div>
          <div className="text-warm-muted/40">→</div>
          <div><div className="text-[8px] text-warm-muted">Achieved</div>
            <div className={`text-[16px] font-black ${tree.converged ? 'text-green-600' : 'text-amber-500'}`}>
              {tree.final_egr_pct} {tree.converged ? '✓' : '⚠'}</div></div>
        </div>
        <div className="mt-1 text-[8px] text-warm-muted font-mono">{fmt(tree.original_total)} → {fmt(tree.final_total)}</div>
      </div>
    </div>
  );
}

function MacroCard({ macro, macroField }: { macro: MacroCategory; macroField: string }) {
  return (
    <div className="w-full h-full flex flex-col justify-between p-3 select-none">
      <div>
        <div className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: `${ACCENT.macro}99` }}>{macroField}</div>
        <div className="text-[13px] font-black text-warm-text leading-tight truncate">{macro.label}</div>
      </div>
      <div>
        <div className="mb-1.5">
          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase"
            style={{ backgroundColor: `${ACCENT.macro}15`, color: ACCENT.macro }}>CATEGORICAL</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-[17px] font-black leading-none ${dCls(macro.delta)}`}>{macro.egr_contribution_pct}</div>
            <div className="text-[8px] text-warm-muted mt-0.5">EGR contribution</div>
          </div>
          <div className="text-right">
            <div className={`text-[12px] font-bold ${dCls(macro.delta)}`}>{macro.change_pct}</div>
            <div className="text-[8px] text-warm-muted">{macro.categories_count} groups</div>
          </div>
        </div>
        <div className="mt-1.5 h-1 rounded-full bg-warm-border/30">
          <div className="h-1 rounded-full opacity-70" style={{ width: '100%', backgroundColor: dHex(macro.delta) }} />
        </div>
      </div>
    </div>
  );
}

function CatCard({ cat, catField }: { cat: TreeCategory; catField: string }) {
  return (
    <div className="w-full h-full flex flex-col justify-between p-3 select-none">
      <div>
        <div className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: `${ACCENT.cat}99` }}>{catField}</div>
        <div className="text-[13px] font-black text-warm-text leading-tight truncate">{cat.label}</div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase"
            style={{ backgroundColor: `${ACCENT.cat}15`, color: ACCENT.cat }}>PERIOD</span>
          <span className="text-[8px] text-warm-muted">{cat.data_points_count} pts</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-[17px] font-black leading-none ${dCls(cat.delta)}`}>{cat.egr_contribution_pct}</div>
            <div className="text-[8px] text-warm-muted mt-0.5">EGR contribution</div>
          </div>
          <div className="text-right">
            <div className={`text-[12px] font-bold ${dCls(cat.delta)}`}>{cat.change_pct}</div>
            <div className="text-[8px] font-mono text-warm-muted">{fmt(cat.original_value)} → {fmt(cat.final_value)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main canvas ───────────────────────────────────────────────────────────────
interface Props { tree: WorldModelTreeType }

export default function WorldModelCanvasTree({ tree }: Props) {
  const schema     = tree.hierarchy_schema;
  const macroField = schema.macro_field ?? schema.levels.find(l => l.level === 'macro_category')?.label ?? 'Group';
  const catField   = schema.category_field ?? schema.levels.find(l => l.level === 'category')?.label ?? 'Period';

  const { pos: initPos, conns, canvasH } = computeLayout(tree);
  const [positions, setPositions] = useState(initPos);
  const [zoom,      setZoom]      = useState(1);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [modal,     setModal]     = useState<ModalData | null>(null);
  const [drag,      setDrag]      = useState<{ id: string; ox: number; oy: number } | null>(null);
  const dragMovedRef              = useRef(false);

  useEffect(() => { setPositions(computeLayout(tree).pos); }, [tree]);

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    dragMovedRef.current = false;
    const p = positions[id];
    setDrag({ id, ox: e.clientX / zoom - p.x, oy: e.clientY / zoom - p.y });
    setHighlight(id);
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      dragMovedRef.current = true;
      setPositions(prev => ({
        ...prev,
        [drag.id]: { x: Math.max(0, e.clientX / zoom - drag.ox), y: Math.max(0, e.clientY / zoom - drag.oy) },
      }));
    };
    const onUp = () => setDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [drag, zoom]);

  const handleCardClick = (id: string) => {
    if (dragMovedRef.current) return;
    setHighlight(h => h === id ? null : id);
    if (id === 'root') {
      setModal({ type: 'root', tree });
    } else if (id.startsWith('macro__')) {
      const macro = tree.macro_categories.find(m => macroId(m.label) === id);
      if (macro) setModal({ type: 'macro', macro, macroField, catField });
    } else if (id.startsWith('cat__')) {
      const [, ml, cl] = id.split('__');
      const macro = tree.macro_categories.find(m => m.label === ml);
      const cat   = macro?.categories.find(c => c.label === cl);
      if (macro && cat) setModal({ type: 'cat', macro, cat, macroField, catField });
    }
  };

  function connPath(fromId: string, toId: string) {
    const f = positions[fromId], t = positions[toId];
    if (!f || !t) return '';
    return directBezier(f.x + CW, f.y + CH / 2, t.x, t.y + CH / 2);
  }

  const isActive = (a: string, b: string) => highlight === a || highlight === b;
  const totalW   = COL * 2 + CW + 40 + 20;

  return (
    <>
      <div className="flex flex-col">
        <div className="w-full overflow-x-auto no-scrollbar pb-4">
          <div className="relative" style={{ minWidth: totalW }}>
            {/* Zoom controls */}
            <div className="absolute bottom-4 left-4 z-30 flex items-center gap-1 bg-white/95 border border-warm-border p-1.5 rounded-xl shadow-md select-none">
              <button type="button" onClick={() => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(1)))}
                className="h-6 w-6 rounded bg-warm-bg hover:bg-warm-border/30 text-warm-text font-bold text-[13px] flex items-center justify-center cursor-pointer">−</button>
              <span className="text-[10px] font-mono font-bold text-warm-muted px-1 min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom(z => Math.min(1.6, +(z + 0.1).toFixed(1)))}
                className="h-6 w-6 rounded bg-warm-bg hover:bg-warm-border/30 text-warm-text font-bold text-[13px] flex items-center justify-center cursor-pointer">+</button>
              <button type="button" onClick={() => setZoom(1)}
                className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase cursor-pointer"
                style={{ backgroundColor: `${ACCENT.root}15`, color: ACCENT.root }}>Reset</button>
            </div>

            {/* Canvas */}
            <div className="relative origin-top-left"
              style={{ width: totalW, height: canvasH * zoom + 60, minHeight: 420 }}>
              <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: totalW, height: canvasH, position: 'absolute', top: 0, left: 0 }}>
                <svg className="absolute inset-0 pointer-events-none z-10 overflow-visible"
                  style={{ width: '100%', height: '100%' }} overflow="visible">
                  {conns.map(({ fromId, toId }, i) => {
                    const active = isActive(fromId, toId);
                    return (
                      <g key={i}>
                        <path d={connPath(fromId, toId)}
                          stroke={active ? ACCENT.root : '#DFDCD8'} strokeWidth={active ? 2.5 : 1.5}
                          fill="none" strokeDasharray={active ? '6 4' : '4 6'} />
                        {positions[fromId] && <circle cx={positions[fromId].x + CW} cy={positions[fromId].y + CH / 2}
                          r={active ? 4 : 3} fill={active ? ACCENT.root : '#C8C3BC'} />}
                        {positions[toId] && <circle cx={positions[toId].x} cy={positions[toId].y + CH / 2}
                          r={active ? 4 : 2.5} fill={active ? '#FFF2EE' : '#F5F3F0'}
                          stroke={active ? ACCENT.root : '#C8C3BC'} strokeWidth={active ? 1.8 : 1.2} />}
                      </g>
                    );
                  })}
                </svg>

                {/* Root */}
                {(() => { const id = 'root', p = positions[id], hl = highlight === id; return (
                  <div className="absolute bg-white rounded-xl border shadow-md overflow-hidden cursor-pointer transition-all hover:shadow-lg"
                    style={{ left: p?.x ?? 20, top: p?.y ?? 0, width: CW, height: CH, zIndex: drag?.id === id ? 50 : 20,
                      borderColor: hl ? ACCENT.root : '#EFECE8', boxShadow: hl ? `0 0 0 2px ${ACCENT.root}30` : undefined }}
                    onMouseDown={e => handleMouseDown(e, id)} onClick={() => handleCardClick(id)}>
                    <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: ACCENT.root }} />
                    <RootCard tree={tree} />
                  </div>
                ); })()}

                {/* Macros */}
                {tree.macro_categories.map(macro => { const id = macroId(macro.label), p = positions[id], hl = highlight === id; if (!p) return null; return (
                  <div key={id} className="absolute bg-white rounded-xl border shadow-md overflow-hidden cursor-pointer transition-all hover:shadow-lg"
                    style={{ left: p.x, top: p.y, width: CW, height: CH, zIndex: drag?.id === id ? 50 : 20,
                      borderColor: hl ? ACCENT.macro : '#EFECE8', boxShadow: hl ? `0 0 0 2px ${ACCENT.macro}30` : undefined }}
                    onMouseDown={e => handleMouseDown(e, id)} onClick={() => handleCardClick(id)}>
                    <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: ACCENT.macro }} />
                    <MacroCard macro={macro} macroField={macroField} />
                  </div>
                ); })}

                {/* Categories */}
                {tree.macro_categories.flatMap(macro => macro.categories.map(cat => {
                  const id = catId(macro.label, cat.label), p = positions[id], hl = highlight === id;
                  if (!p) return null;
                  return (
                    <div key={id} className="absolute bg-white rounded-xl border shadow-md overflow-hidden cursor-pointer transition-all hover:shadow-lg"
                      style={{ left: p.x, top: p.y, width: CW, height: CH, zIndex: drag?.id === id ? 50 : 20,
                        borderColor: hl ? ACCENT.cat : '#EFECE8', boxShadow: hl ? `0 0 0 2px ${ACCENT.cat}30` : undefined }}
                      onMouseDown={e => handleMouseDown(e, id)} onClick={() => handleCardClick(id)}>
                      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: ACCENT.cat }} />
                      <CatCard cat={cat} catField={catField} />
                    </div>
                  );
                }))}
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] text-warm-muted/60 mt-1">
          Drag to reposition · click any card to view details
        </p>
      </div>

      {modal && <Modal data={modal} onClose={() => setModal(null)} />}
    </>
  );
}
