import { useState, useContext } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Tooltip,
  Tab,
  Tabs,
  IconButton,
  Collapse,
  useTheme
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MemoryIcon from '@mui/icons-material/Memory';
import CloudIcon from '@mui/icons-material/Cloud';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { runLocalSimulation } from '../utils/localSim';
import { runCloudOptimization } from '../utils/cloudOpt';
import { SimulationResult, OptimizationResult } from '../utils/types';
import { AppContext } from '../App';
import WaveformViewer from './WaveformViewer';
import CloudOptimizationViewer from './CloudOptimizationViewer';

const ActionBar: React.FC = () => {
  const { code } = useContext(AppContext);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // State for simulations
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState<SimulationResult | null>(null);
  
  // State for cloud optimization
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult | null>(null);
  
  // 当前选中的标签页
  const [tabValue, setTabValue] = useState(0);
  
  // 折叠状态
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Intel品牌蓝色
  const intelBlue = '#0071c5';
  const intelLightBlue = '#00b2e3';
  
  // Run local simulation
  const handleRunSimulation = async () => {
    if (isSimulating || !code) return;
    
    setIsSimulating(true);
    setSimulationResults(null);
    setTabValue(0); // 切换到仿真标签页
    setIsExpanded(true); // 自动展开结果区域
    
    try {
      const results = await runLocalSimulation(code);
      setSimulationResults(results);
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setIsSimulating(false);
    }
  };
  
  // Run cloud optimization
  const handleRunOptimization = async () => {
    if (isOptimizing || !code) return;
    
    setIsOptimizing(true);
    setOptimizationProgress(0);
    setOptimizationResults(null);
    setTabValue(1); // 切换到优化标签页
    setIsExpanded(true); // 自动展开结果区域
    
    try {
      const results = await runCloudOptimization(code, progress => {
        setOptimizationProgress(progress);
      });
      setOptimizationResults(results);
    } catch (error) {
      console.error('Optimization error:', error);
      // 设置错误状态，让CloudOptimizationViewer显示错误信息
      const errorResult: OptimizationResult = {
        status: 'failed',
        error_details: error instanceof Error ? error.message : '优化过程中发生未知错误'
      };
      setOptimizationResults(errorResult);
    } finally {
      setIsOptimizing(false);
    }
  };
  
  // 处理标签页切换
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // 处理折叠/展开
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%'
    }}>
      {/* 顶部控制栏 */}
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={handleRunSimulation}
            disabled={isSimulating || isOptimizing || !code}
            sx={{ 
              bgcolor: isDarkMode ? intelBlue : intelBlue,
              '&:hover': {
                bgcolor: isDarkMode ? '#0062a8' : '#0062a8'
              }
            }}
          >
            本地仿真
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<CloudUploadIcon />}
            onClick={handleRunOptimization}
            disabled={isSimulating || isOptimizing || !code}
            sx={{ 
              bgcolor: isDarkMode ? intelLightBlue : intelLightBlue,
              '&:hover': {
                bgcolor: isDarkMode ? '#00a0cf' : '#00a0cf'
              }
            }}
          >
            云端优化
          </Button>
        </Box>
        
        {/* 显示当前操作状态 */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isSimulating && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: 20, height: 20, mr: 1 }} className="loader-small" />
              <Typography variant="caption" sx={{ fontFamily: 'Consolas, monospace' }}>
                正在运行本地仿真...
              </Typography>
            </Box>
          )}
          
          {isOptimizing && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: 20, height: 20, mr: 1 }} className="loader-small" />
              <Typography variant="caption" sx={{ fontFamily: 'Consolas, monospace' }}>
                正在运行云端优化... {optimizationProgress}%
              </Typography>
            </Box>
          )}
          
          {/* 折叠/展开按钮 */}
          <Tooltip title={isExpanded ? "折叠结果面板" : "展开结果面板"}>
            <IconButton onClick={toggleExpand} size="small" sx={{ ml: 2 }}>
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* 标签页切换 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          sx={{ 
            '.MuiTab-root': { 
              minHeight: 40,
              py: 0
            },
            '.Mui-selected': {
              color: tabValue === 0 ? intelBlue : intelLightBlue
            },
            '.MuiTabs-indicator': {
              backgroundColor: tabValue === 0 ? intelBlue : intelLightBlue
            }
          }}
        >
          <Tab 
            icon={<MemoryIcon sx={{ fontSize: 16, mr: 0.5 }} />}
            iconPosition="start"
            label="本地仿真" 
            sx={{ 
              fontFamily: 'Consolas, monospace',
              fontSize: '0.85rem',
              textTransform: 'none'
            }} 
          />
          <Tab 
            icon={<CloudIcon sx={{ fontSize: 16, mr: 0.5 }} />}
            iconPosition="start"
            label="云端优化" 
            sx={{ 
              fontFamily: 'Consolas, monospace',
              fontSize: '0.85rem',
              textTransform: 'none'
            }} 
          />
        </Tabs>
      </Box>
      
      {/* 结果显示区域 - 使用Collapse实现折叠功能 */}
      <Collapse in={isExpanded} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 本地仿真结果 */}
        <Box
          role="tabpanel"
          hidden={tabValue !== 0}
          sx={{ 
            display: tabValue === 0 ? 'flex' : 'none',
            height: '100%',
            flexDirection: 'column',
            flexGrow: 1
          }}
        >
          {tabValue === 0 && (
            <WaveformViewer 
              simulationResults={simulationResults}
              isLoading={isSimulating}
            />
          )}
        </Box>
        
        {/* 云端优化结果 */}
        <Box
          role="tabpanel"
          hidden={tabValue !== 1}
          sx={{ 
            display: tabValue === 1 ? 'flex' : 'none',
            height: '100%',
            flexDirection: 'column',
            flexGrow: 1
          }}
        >
          {tabValue === 1 && (
            <CloudOptimizationViewer 
              optimizationResults={optimizationResults}
              isLoading={isOptimizing}
            />
          )}
        </Box>
      </Collapse>
      
      {/* 折叠状态下显示的最小化提示 */}
      {!isExpanded && (
        <Box 
          sx={{ 
            p: 1, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: theme.palette.action.hover
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {tabValue === 0 ? '波形查看器已折叠' : '云端优化结果已折叠'} (点击上方
            <ExpandMoreIcon sx={{ fontSize: 14, verticalAlign: 'middle', mx: 0.5 }} />
            按钮展开)
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ActionBar; 