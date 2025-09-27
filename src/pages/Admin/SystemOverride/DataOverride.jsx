import React, { useState } from 'react';
import { Settings, Database, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { getData, updateData, removeData } from '../../../firebase/db';

const DataOverride = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [selectedPath, setSelectedPath] = useState('');
  const [jsonData, setJsonData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const dataPaths = {
    users: 'users',
    rawMaterials: 'rawMaterials',
    packingMaterials: 'packingMaterials',
    products: 'products',
    suppliers: 'suppliers',
    materialRequests: 'materialRequests',
    stockMovements: 'stockMovements',
    qcRecords: 'qcRecords',
    invoices: 'invoices'
  };

  const handleLoadData = async () => {
    if (!selectedPath) {
      setError('Please select a data path');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await getData(selectedPath);
      setJsonData(JSON.stringify(data, null, 2));
    } catch (error) {
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveData = async () => {
    if (!selectedPath || !jsonData) {
      setError('Please select a path and provide JSON data');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const parsedData = JSON.parse(jsonData);
      await updateData(selectedPath, parsedData);
      setSuccess('Data updated successfully!');
    } catch (error) {
      if (error instanceof SyntaxError) {
        setError('Invalid JSON format. Please check your syntax.');
      } else {
        setError(`Failed to save data: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePath = async () => {
    if (!selectedPath) {
      setError('Please select a data path');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete all data at path "${selectedPath}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await removeData(selectedPath);
      setJsonData('');
      setSuccess('Data deleted successfully!');
    } catch (error) {
      setError(`Failed to delete data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center">
          <Settings className="h-8 w-8 text-red-600 mr-3" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Data Override</h1>
            <p className="text-gray-600 mt-2">⚠️ Admin-only: Direct database access for fixing incorrect data</p>
          </div>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <div>
            <p className="text-red-800 font-medium">⚠️ Warning: Advanced Feature</p>
            <p className="text-red-600 text-sm">
              This tool allows direct database manipulation. Use with extreme caution as incorrect changes can break the system.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Paths</h3>
          <div className="space-y-2">
            {Object.entries(dataPaths).map(([key, path]) => (
              <button
                key={key}
                onClick={() => setSelectedPath(path)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedPath === path
                    ? 'bg-blue-50 border border-blue-200 text-blue-900'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{key}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{path}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={handleLoadData}
              disabled={!selectedPath || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Load Data</span>
            </button>
            
            <button
              onClick={handleSaveData}
              disabled={!selectedPath || !jsonData || loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
            
            <button
              onClick={handleDeletePath}
              disabled={!selectedPath || loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Delete Path</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">JSON Data Editor</h3>
              {selectedPath && (
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Path: {selectedPath}
                </span>
              )}
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            <textarea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder={selectedPath ? 'Click "Load Data" to fetch current data, or paste JSON here to override...' : 'Select a data path first'}
              className="w-full h-96 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              disabled={!selectedPath}
            />

            <div className="mt-4 text-sm text-gray-500">
              <p><strong>Usage Instructions:</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Select a data path from the left panel</li>
                <li>Click "Load Data" to view current database content</li>
                <li>Edit the JSON directly in the text area</li>
                <li>Click "Save Changes" to update the database</li>
                <li>Use "Delete Path" to remove entire data sections (use with extreme caution)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataOverride;