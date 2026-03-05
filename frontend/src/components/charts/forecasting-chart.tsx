'use client';

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

const data = [
    { name: 'Jan', historical: 4000, forecasted: 4000 },
    { name: 'Feb', historical: 3000, forecasted: 3000 },
    { name: 'Mar', historical: 2000, forecasted: 2000 },
    { name: 'Apr', historical: 2780, forecasted: 2780 },
    { name: 'May', historical: 1890, forecasted: 1890 },
    { name: 'Jun', historical: 2390, forecasted: 2390 },
    { name: 'Jul', historical: 3490, forecasted: 3490 },
    { name: 'Aug', historical: 4000, forecasted: 4000 },
    { name: 'Sep', historical: 4200, forecasted: 4200 },
    { name: 'Oct', historical: 4800, forecasted: 4800 },
    { name: 'Nov', historical: 5200, forecasted: 5100 },
    { name: 'Dec', historical: null, forecasted: 5800 },
    { name: 'Jan 26', historical: null, forecasted: 6200 },
    { name: 'Feb 26', historical: null, forecasted: 6500 },
];

export function ForecastingChart() {
    return (
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#004E64" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#004E64" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#004E64" strokeOpacity={0.05} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#004E64', opacity: 0.4, fontSize: 10, fontWeight: 600 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#004E64', opacity: 0.4, fontSize: 10, fontWeight: 600 }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="historical"
                        stroke="#004E64"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorHist)"
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#004E64' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="forecasted"
                        stroke="#0ea5e9"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        fillOpacity={1}
                        fill="url(#colorFore)"
                        dot={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
