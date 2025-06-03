// app/adminn/analytics/page.js
'use client';
import { useState } from 'react';
import styles from './Analytics.module.css';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const data = [
  { name: 'Jan', websites: 4, listings: 12, traffic: 140 },
  { name: 'Feb', websites: 7, listings: 19, traffic: 198 },
  { name: 'Mar', websites: 5, listings: 22, traffic: 215 },
  { name: 'Apr', websites: 8, listings: 25, traffic: 250 },
  { name: 'May', websites: 12, listings: 30, traffic: 310 },
  { name: 'Jun', websites: 10, listings: 29, traffic: 350 },
];

export default function Analytics() {
  const [timeframe, setTimeframe] = useState('monthly');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <div className="flex items-center space-x-4">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className={styles.select}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <button type="button" className={styles.exportButton}>
            Export
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Website Creations</h2>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="websites" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Listings Created</h2>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="listings" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${styles.card} ${styles.gridWide}`}>
          <h2 className={styles.cardTitle}>Website Traffic Overview</h2>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="traffic" stroke="#ff7300" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
