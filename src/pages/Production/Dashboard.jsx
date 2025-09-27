import React from 'react';
import { Factory, PlayCircle, PauseCircle, CheckCircle2, Package, Send, Plus, Clock, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { productionService } from '../../services/productionService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const ProductionDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = React.useState([]);
  const [activeBatches, setActiveBatches] = React.useState([]);
  const [pendingHandovers, setPendingHandovers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [batches, handovers, rawMaterialRequests] = await Promise.all([
        productionService.getBatches(),
        productionService.getBatchHandovers(),
        productionService.getRawMaterialRequests()
      ]);

      const activeBatchCount = batches.filter(b => ['created', 'mixing', 'heating', 'cooling'].includes(b.status)).length;
      const completedToday = batches.filter(b => 
        b.status === 'completed' && 
        new Date(b.completedAt).toDateString() === new Date().toDateString()
      ).length;
      const onHoldCount = batches.filter(b => b.status === 'on_hold').length;
      const totalProduction = batches.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.outputQuantity || 0), 0);
      const pendingRequests = rawMaterialRequests.filter(r => r.status === 'submitted_to_warehouse').length;

      setStats([
        {
          name: 'Active Batches',
          value: activeBatchCount.toString(),
          change: `${batches.filter(b => b.stage === 'mixing').length} in mixing`,
          changeType: 'neutral',
          icon: PlayCircle,
          color: 'blue'
        },
        {
          name: 'Completed Today',
          value: completedToday.toString(),
          change: '+1 vs yesterday',
          changeType: 'positive',
          icon: CheckCircle2,
          color: 'green'
        },
        {
          name: 'On Hold',
          value: onHoldCount.toString(),
          change: 'QC pending',
          changeType: 'neutral',
          icon: PauseCircle,
          color: 'yellow'
        },
        {
          name: 'Total Production',
          value: `${totalProduction.toLocaleString()}kg`,
          change: 'This month',
          changeType: 'neutral',
          icon: Factory,
          color: 'purple'
        }
      ]);

      setActiveBatches(batches.filter(b => !['completed', 'handed_over'].includes(b.status)).slice(0, 4));
      setPendingHandovers(handovers.filter(h => !h.receivedByPacking).slice(0, 3));
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const defaultStats = [
    {
      name: 'Active Batches',
      value: '6',
      change: '2 in mixing',
      changeType: 'neutral',
      icon: PlayCircle,
      color: 'blue'
    },
    {
      name: 'Completed Today',
      value: '4',
      change: '+1 vs yesterday',
      changeType: 'positive',
      icon: CheckCircle2,
      color: 'green'
    },
    {
      name: 'On Hold',
      value: '2',
      change: 'QC pending',
      changeType: 'neutral',
      icon: PauseCircle,
      color: 'yellow'
    },
    {
      name: 'Total Production',
      value: '2,450kg',
      change: 'This month',
      changeType: 'neutral',
      icon: Factory,
      color: 'purple'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  const quickActions = [
    {
      title: 'Manage Products',
      description: 'Create and manage production products',
      icon: Package,
      color: 'bg-purple-600 hover:bg-purple-700',
      path: '/production/products'
    },
    {
      title: 'Active Monitor',
      description: 'Real-time batch monitoring',
      icon: Clock,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      path: '/production/monitor'
    },
    {
      title: 'Request Raw Materials',
      description: 'Request materials from warehouse',
      icon: Package,
      color: 'bg-blue-600 hover:bg-blue-700',
      path: '/production/raw-material-requests'
    },
    {
      title: 'Create New Batch',
      description: 'Start a new production batch',
      icon: Plus,
      color: 'bg-green-600 hover:bg-green-700',
      path: '/production/create-batch'
    },
    {
      title: 'Batch Table',
      description: 'View all batches in table format',
      icon: FileText,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      path: '/production/batch-table'
    },
    {
      title: 'Handover to Packing',
      description: 'Transfer completed batches',
      icon: Send,
      color: 'bg-purple-600 hover:bg-purple-700',
      path: '/production/handover'
    },
    {
      title: 'QC Records',
      description: 'View quality control history',
      icon: CheckCircle2,
      color: 'bg-orange-600 hover:bg-orange-700',
      path: '/production/qc-records'
    }
  ];

  if (loading) {
    return <LoadingSpinner text="Loading production dashboard..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Factory className="h-8 w-8 mr-3 text-blue-600" />
          Production Dashboard
        </h1>
        <p className="text-gray-600">Monitor production batches and manufacturing processes.</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {(stats.length > 0 ? stats : defaultStats).map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses[stat.color]}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium text-gray-600">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="space-y-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className={`w-full p-4 rounded-lg text-white text-left transition-colors ${action.color}`}
              >
                <div className="flex items-center space-x-3">
                  <action.icon className="h-6 w-6" />
                  <div>
                    <h4 className="font-medium">{action.title}</h4>
                    <p className="text-sm opacity-90">{action.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Active Batches</h3>
            <button
              onClick={() => navigate('/production/batches')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {activeBatches.length === 0 ? (
              <div className="text-center py-8">
                <Factory className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No active batches</p>
              </div>
            ) : (
              activeBatches.map((batch) => (
                <div key={batch.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{batch.batchNumber}</p>
                      <p className="text-sm text-gray-500">{batch.productName}</p>
                      <p className="text-sm text-gray-500">Stage: {batch.stage}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{width: `${batch.progress || 0}%`}}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{batch.progress || 0}%</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        batch.status === 'created' || batch.status === 'mixing' || batch.status === 'heating' || batch.status === 'cooling' ? 'bg-green-100 text-green-800' :
                        batch.status === 'qc_pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {batch.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {pendingHandovers.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pending Handovers to Packing</h3>
            <button
              onClick={() => navigate('/production/handover')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {pendingHandovers.map((handover) => (
              <div key={handover.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{handover.productName}</p>
                    <p className="text-sm text-gray-500">Batch: {handover.batchNumber}</p>
                    <p className="text-sm text-gray-500">{handover.quantity} {handover.unit}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-600">Awaiting Packing Receipt</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionDashboard;