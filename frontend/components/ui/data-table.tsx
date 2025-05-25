'use client';

import React, { useState, useMemo } from 'react';
import { Download, BarChart3, Table as TableIcon, Eye, EyeOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import Papa from 'papaparse';

interface DataTableProps {
  data: any[];
  title?: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

export function DataTable({ data, title = "Analysis Results" }: DataTableProps) {
  const [showVisualization, setShowVisualization] = useState(false);
  const [visualizationType, setVisualizationType] = useState<'bar' | 'line' | 'pie'>('bar');

  // 处理数据，获取列名和行数据
  const { columns, rows, numericColumns } = useMemo(() => {
    if (!data || data.length === 0) {
      return { columns: [], rows: [], numericColumns: [] };
    }

    const cols = Object.keys(data[0]);
    const numericCols = cols.filter(col => {
      return data.some(row => typeof row[col] === 'number' && !isNaN(row[col]));
    });

    return {
      columns: cols,
      rows: data,
      numericColumns: numericCols
    };
  }, [data]);

  // 准备可视化数据
  const chartData = useMemo(() => {
    if (!data || data.length === 0 || numericColumns.length === 0) {
      return [];
    }

    return data.slice(0, 10).map((row, index) => {
      const item: any = { name: row[columns[0]] || `Item ${index + 1}` };
      numericColumns.forEach(col => {
        item[col] = typeof row[col] === 'number' ? row[col] : 0;
      });
      return item;
    });
  }, [data, columns, numericColumns]);

  // 下载为CSV
  const downloadCSV = () => {
    if (!data || data.length === 0) return;
    
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 下载为JSON
  const downloadJSON = () => {
    if (!data || data.length === 0) return;
    
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!data || data.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-center">No data to display</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TableIcon className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <span className="text-xs text-gray-500">({data.length} rows)</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Visualization Toggle */}
          {numericColumns.length > 0 && (
            <button
              onClick={() => setShowVisualization(!showVisualization)}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              {showVisualization ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showVisualization ? 'Hide Chart' : 'Show Chart'}</span>
            </button>
          )}
          
          {/* Download Buttons */}
          <div className="flex space-x-1">
            <button
              onClick={downloadCSV}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>CSV</span>
            </button>
            <button
              onClick={downloadJSON}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visualization */}
      {showVisualization && numericColumns.length > 0 && chartData.length > 0 && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-700">Data Visualization</h4>
            <div className="flex space-x-1">
              {['bar', 'line', 'pie'].map((type) => (
                <button
                  key={type}
                  onClick={() => setVisualizationType(type as any)}
                  className={`px-2 py-1 text-xs rounded capitalize ${
                    visualizationType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              {visualizationType === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  {numericColumns.map((col, index) => (
                    <Bar key={col} dataKey={col} fill={COLORS[index % COLORS.length]} />
                  ))}
                </BarChart>
              ) : visualizationType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  {numericColumns.map((col, index) => (
                    <Line 
                      key={col} 
                      type="monotone" 
                      dataKey={col} 
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              ) : (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey={numericColumns[0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="overflow-x-auto max-h-96">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columns.map((column) => (
                  <td key={column} className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                    {typeof row[column] === 'object' 
                      ? JSON.stringify(row[column])
                      : String(row[column] ?? '')
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 