import { useState, useEffect, createContext, useRef } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Box, 
  Grid, 
  Paper, 
  ThemeProvider, 
  PaletteMode,
  Chip
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import { createAppTheme, getSavedThemePreference, saveThemePreference } from './theme';
import EditorPane from './components/EditorPane';
import GraphPane from './components/GraphPane';
import ErrorList from './components/ErrorList';
import ActionBar from './components/ActionBar';
import ExplainDrawer from './components/ExplainDrawer';
import IntelArchBanner from './components/IntelArchBanner';
import IntelLoadingIndicator from './components/IntelLoadingIndicator';
import LocalModelStatus from './components/LocalModelStatus';
import { Node, Edge, LintError, NodeExplanation } from './utils/types';
import { 
  parseVerilog 
} from './utils/parser';
import { 
  lintCode, 
  lintCodeSync
} from './utils/lintStub';
import { 
  analyzeWithAI, 
  analyzeWithAISync, 
  applyCodeFix 
} from './utils/aiStub';
import { 
  ModelStatus, 
  startHealthMonitoring, 
  subscribeToStatusChanges,
  getTinyBertStatus,
  getLLMStatus 
} from './utils/modelService';

// Sample Verilog code
const SAMPLE_VERILOG_CODE = `module uart_controller(
  input wire clk,              // 系统时钟
  input wire rst_n,            // 低电平有效复位
  input wire rx,               // 接收数据线
  output wire tx,              // 发送数据线
  input wire [7:0] tx_data,    // 要发送的数据
  input wire tx_valid,         // 发送数据有效
  output wire tx_ready,        // 发送器就绪
  output wire [7:0] rx_data,   // 接收到的数据
  output wire rx_valid,        // 接收数据有效
  input wire rx_ready          // 接收器就绪
);

  // 内部参数定义
  parameter CLK_FREQ = 50000000;   // 50MHz时钟
  parameter BAUD_RATE = 115200;    // 波特率
  parameter CLKS_PER_BIT = CLK_FREQ / BAUD_RATE;  // 每位占用的时钟周期数

  // 状态机状态定义
  localparam IDLE = 2'b00;
  localparam START = 2'b01;
  localparam DATA = 2'b10;
  localparam STOP = 2'b11;

  // 内部信号定义
  reg [1:0] tx_state;      // 发送状态机
  reg [1:0] rx_state;      // 接收状态机
  reg [15:0] tx_counter;   // 发送计数器
  reg [15:0] rx_counter;   // 接收计数器
  reg [2:0] tx_bit_index;  // 发送位索引
  reg [2:0] rx_bit_index;  // 接收位索引
  reg [7:0] tx_buffer;     // 发送缓冲
  reg [7:0] rx_buffer;     // 接收缓冲
  reg tx_out;              // 输出寄存器
  reg rx_done;             // 接收完成标志
  wire transmitting;       // 正在发送标志 - 未使用的信号

  // 错误1: 寄存器赋值错误 - 在always块中使用阻塞赋值
  always @(posedge clk) begin
    if (!rst_n) begin
      tx_state = IDLE;     // 应该使用非阻塞赋值 <=
      tx_counter = 0;      // 应该使用非阻塞赋值 <=
      tx_bit_index = 0;    // 应该使用非阻塞赋值 <=
      tx_out = 1'b1;       // 应该使用非阻塞赋值 <=
    end else begin
      case (tx_state)
        IDLE: begin
          tx_out <= 1'b1;  // 空闲时发送线保持高电平
          tx_counter <= 0;
          tx_bit_index <= 0;
          
          // 错误2: 信号宽度不匹配 - tx_valid是1位，但与8位值比较
          if (tx_valid == 8'b1) begin  // 应该是 if (tx_valid)
            tx_buffer <= tx_data;
            tx_state <= START;
          end
        end
        
        START: begin
          tx_out <= 1'b0;  // 起始位为低电平
          // 计数器达到一个波特周期
          if (tx_counter < CLKS_PER_BIT - 1) begin
            tx_counter <= tx_counter + 1;
          end else begin
            tx_counter <= 0;
            tx_state <= DATA;
          end
        end
        
        DATA: begin
          tx_out <= tx_buffer[tx_bit_index];
          // 计数器达到一个波特周期
          if (tx_counter < CLKS_PER_BIT - 1) begin
            tx_counter <= tx_counter + 1;
          end else begin
            tx_counter <= 0;
            if (tx_bit_index < 7) begin
              tx_bit_index <= tx_bit_index + 1;
            end else begin
              tx_bit_index <= 0;
              tx_state <= STOP;
            end
          end
        end
        
        STOP: begin
          tx_out <= 1'b1;  // 停止位为高电平
          if (tx_counter < CLKS_PER_BIT - 1) begin
            tx_counter <= tx_counter + 1;
          end else begin
            tx_counter <= 0;
            tx_state <= IDLE;
          end
        end
        
        // 错误3: 缺少默认分支，可能导致锁存器生成
        // 应该添加 default 分支
      endcase
    end
  end

  // 接收状态机
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      rx_state <= IDLE;
      rx_counter <= 0;
      rx_bit_index <= 0;
      rx_buffer <= 8'h00;
      rx_done <= 1'b0;
    end else begin
      case (rx_state)
        IDLE: begin
          rx_done <= 1'b0;
          rx_counter <= 0;
          rx_bit_index <= 0;
          
          // 检测起始位（低电平）
          if (rx == 1'b0) begin
            rx_state <= START;
          end
        end
        
        START: begin
          // 在起始位中间采样，确认是否是有效的起始位
          if (rx_counter == CLKS_PER_BIT/2) begin
            if (rx == 1'b0) begin
              rx_counter <= rx_counter + 1;
            end else begin
              // 如果不是有效的起始位，返回空闲状态
              rx_state <= IDLE;
            end
          end else if (rx_counter < CLKS_PER_BIT - 1) begin
            rx_counter <= rx_counter + 1;
          end else begin
            rx_counter <= 0;
            rx_state <= DATA;
          end
        end
        
        DATA: begin
          // 在每一位的中间采样
          if (rx_counter == CLKS_PER_BIT/2) begin
            rx_buffer[rx_bit_index] <= rx;
          end
          
          if (rx_counter < CLKS_PER_BIT - 1) begin
            rx_counter <= rx_counter + 1;
          end else begin
            rx_counter <= 0;
            if (rx_bit_index < 7) begin
              rx_bit_index <= rx_bit_index + 1;
            end else begin
              rx_bit_index <= 0;
              rx_state <= STOP;
            end
          end
        end
        
        STOP: begin
          // 检查停止位是否为高电平
          if (rx_counter < CLKS_PER_BIT - 1) begin
            rx_counter <= rx_counter + 1;
          end else begin
            rx_done <= 1'b1;
            rx_counter <= 0;
            rx_state <= IDLE;
          end
        end
        
        default: begin
          rx_state <= IDLE;
        end
      endcase
    end
  end

  // 输出赋值
  assign tx = tx_out;
  assign tx_ready = (tx_state == IDLE);
  assign rx_valid = rx_done;
  assign rx_data = rx_buffer;

endmodule`;

// Create App Context for sharing state
interface AppContextType {
  code: string;
  setCode: (code: string) => void;
  graph: { nodes: Node[]; edges: Edge[] };
  lintErrors: LintError[];
  selectedNode: Node | null;
  nodeExplanation: NodeExplanation | null;
}

export const AppContext = createContext<AppContextType>({
  code: '',
  setCode: () => {},
  graph: { nodes: [], edges: [] },
  lintErrors: [],
  selectedNode: null,
  nodeExplanation: null
});

function App() {
  // Theme state
  const [mode, setMode] = useState<PaletteMode>(getSavedThemePreference());
  const theme = createAppTheme(mode);

  // Code and graph state
  const [code, setCode] = useState<string>(SAMPLE_VERILOG_CODE);
  const [graph, setGraph] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const [lintErrors, setLintErrors] = useState<LintError[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeExplanation, setNodeExplanation] = useState<NodeExplanation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  
  // 模型连接状态
  const [tinyBertStatus, setTinyBertStatus] = useState<ModelStatus>({
    isConnected: false,
    lastCheckTime: 0,
    latency: 0,
  });
  const [llmStatus, setLlmStatus] = useState<ModelStatus>({
    isConnected: false,
    lastCheckTime: 0,
    latency: 0,
  });
  
  // 本地模型处理状态
  const [isTinyBertWorking, setIsTinyBertWorking] = useState<boolean>(false);
  const [isLoadingLLM, setIsLoadingLLM] = useState<boolean>(false);
  
  // 编辑状态管理
  const [isUserEditing, setIsUserEditing] = useState<boolean>(false);
  const lastEditTimeRef = useRef<number>(0);

  // 启动健康监测和状态监听
  useEffect(() => {
    // 启动健康监测
    startHealthMonitoring(30000); // 每30秒检查一次
    
    // 订阅状态变化
    const unsubscribe = subscribeToStatusChanges((tinyBert, llm) => {
      setTinyBertStatus(tinyBert);
      setLlmStatus(llm);
    });
    
    // 立即获取一次状态
    setTinyBertStatus(getTinyBertStatus());
    setLlmStatus(getLLMStatus());
    
    return unsubscribe;
  }, []);

  // Toggle theme mode
  const toggleColorMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    saveThemePreference(newMode);
  };

  // 智能处理代码变化 - 只在用户停止编辑时更新
  useEffect(() => {
    if (!code) return;

    const timer = setTimeout(async () => {
      // 如果用户仍在编辑，跳过这次更新
      if (isUserEditing) {
        return;
      }
      
      setIsTinyBertWorking(true);
      
      try {
        // 使用异步版本的lint检查
        const errors = await lintCode(code);
        
        // 解析图表（仍然是同步的）
        const parsedGraph = parseVerilog(code);
        
        // 只在用户不在编辑时更新UI
        if (!isUserEditing) {
          setLintErrors(errors);
          setGraph(parsedGraph);
        }
        
      } catch (error) {
        console.error('代码检查失败：', error);
        // 如果异步检查失败，使用同步fallback
        const errors = lintCodeSync(code);
        const parsedGraph = parseVerilog(code);
        
        if (!isUserEditing) {
          setLintErrors(errors);
          setGraph(parsedGraph);
        }
      } finally {
        setIsTinyBertWorking(false);
      }
    }, 500); // 合理的延迟

    return () => clearTimeout(timer);
  }, [code, isUserEditing]);

  // 初始化图表和错误检查
  useEffect(() => {
    if (code) {
      const initializeCheck = async () => {
        setIsTinyBertWorking(true);
        
        try {
          const parsedGraph = parseVerilog(code);
          setGraph(parsedGraph);
          
          const errors = await lintCode(code);
          setLintErrors(errors);
          
          // 自动高亮第一个错误行
          if (errors.length > 0) {
            setHighlightedLine(errors[0].line);
            // 查找对应的节点
            const errorNode = parsedGraph.nodes.find(n => n.line === errors[0].line);
            if (errorNode) {
              setSelectedNode(errorNode);
            }
          }
        } catch (error) {
          console.error('初始化检查失败：', error);
          // 如果异步检查失败，使用同步fallback
          const parsedGraph = parseVerilog(code);
          setGraph(parsedGraph);
          
          const errors = lintCodeSync(code);
          setLintErrors(errors);
          
          if (errors.length > 0) {
            setHighlightedLine(errors[0].line);
            const errorNode = parsedGraph.nodes.find(n => n.line === errors[0].line);
            if (errorNode) {
              setSelectedNode(errorNode);
            }
          }
        } finally {
          setIsTinyBertWorking(false);
        }
      };
      
      initializeCheck();
    }
  }, []);

  // 处理节点选择 - 触发LLM分析
  const handleNodeSelect = (node: Node) => {
    setSelectedNode(node);
    setHighlightedLine(node.line);
    
    // 查找相关错误
    const error = lintErrors.find(err => err.line === node.line);
    if (error) {
      handleRequestLLMAnalysis(error.code || 'UNKNOWN', node.line);
    }
  };

  // 处理行选择
  const handleLineSelect = (lineNumber: number) => {
    setHighlightedLine(lineNumber);
    
    // 查找相关节点和错误
    const node = graph.nodes.find(n => n.line === lineNumber);
    if (node) {
      setSelectedNode(node);
      
      // 如果这行有错误，不自动请求LLM分析，等用户点击"详细解释"按钮
      const error = lintErrors.find(err => err.line === lineNumber);
      if (error) {
        // 只设置选中状态，不自动请求LLM分析
      }
    }
  };
  
  // 请求LLM分析
  const handleRequestLLMAnalysis = async (errorCode: string, lineNumber: number) => {
    setIsLoadingLLM(true);
    console.log(`请求LLM分析: 错误码=${errorCode}, 行号=${lineNumber}`);
    console.log('注意：LLM代码分析可能需要30-120秒，请耐心等待...');
    
    try {
      // 获取相关节点 - 首先尝试完全匹配行号
      let node = graph.nodes.find(n => n.line === lineNumber);
      
      // 如果没找到完全匹配的节点，尝试使用近似匹配（找最接近的行号）
      if (!node && graph.nodes.length > 0) {
        console.log(`未找到行号 ${lineNumber} 的精确匹配节点，尝试近似匹配...`);
        // 对节点按行号排序，找出最接近的
        const sortedNodes = [...graph.nodes].sort((a, b) => 
          Math.abs(a.line - lineNumber) - Math.abs(b.line - lineNumber)
        );
        node = sortedNodes[0];
        console.log(`找到最接近的节点, 行号: ${node.line}, 类型: ${node.type}, 标签: ${node.label}`);
      }
      
      // 为所找到的节点创建错误描述
      if (node) {
        console.log(`分析节点:`, node);
        try {
          // 手动设置找到的节点的行号为请求的行号，以确保错误解释针对正确的行
          const nodeWithCorrectLine = { ...node, line: lineNumber };
          console.log(`使用修正的行号创建节点:`, nodeWithCorrectLine);
          
          // 使用异步版本的AI分析
          const explanations = await analyzeWithAI([nodeWithCorrectLine]);
          const explanation = explanations[0];
          console.log(`获取到分析结果:`, explanation);
          setNodeExplanation(explanation);
          setDrawerOpen(true);
        } catch (error) {
          console.error(`AI分析出错:`, error);
          // 如果LLM分析失败，使用同步fallback
          const explanations = analyzeWithAISync([{ ...node, line: lineNumber }]);
          const explanation = explanations[0];
          setNodeExplanation(explanation);
          setDrawerOpen(true);
        }
      } else {
        console.warn(`无法找到与行号 ${lineNumber} 相关的节点，甚至没有接近的匹配`);
        // 如果完全找不到节点，创建一个基于错误代码的通用解释
        let errorDescription = '未能找到行号对应的节点信息';
        let fixSuggestion = '请检查代码中的错误';
        
        // 根据错误代码提供更具体的说明
        if (errorCode === 'E001') {
          errorDescription = '在always块中使用了阻塞赋值(=)，应该使用非阻塞赋值(<=)';
          fixSuggestion = '将赋值语句从"="改为"<="';
        } else if (errorCode === 'E002') {
          errorDescription = '信号宽度不匹配: tx_valid是1位，但与8位值比较';
          fixSuggestion = '修改为"if (tx_valid)"而不是"if (tx_valid == 8\'b1)"';
        } else if (errorCode === 'W001') {
          errorDescription = 'case语句缺少default分支，可能导致锁存器生成';
          fixSuggestion = '添加default分支: default: begin tx_state <= IDLE; end';
        }
        
        const dummyExplanation = {
          nodeId: `line-${lineNumber}`,
          explanation: `${errorDescription}。这是一个在行 ${lineNumber} 发现的 ${errorCode} 错误。`,
          fixDescription: '建议修复方式:',
          originalCode: `// 第 ${lineNumber} 行的代码有问题`,
          fixedCode: `// ${fixSuggestion}`
        };
        setNodeExplanation(dummyExplanation);
        setDrawerOpen(true);
      }
    } catch (error) {
      console.error('LLM分析请求失败：', error);
      
      // 检查是否为超时错误
      const isTimeout = error instanceof Error && 
        (error.message.includes('超时') || error.message.includes('timeout') || error.message.includes('AbortError'));
      
      // 创建错误状态下的fallback解释
      const fallbackExplanation = {
        nodeId: `error-${lineNumber}`,
        explanation: isTimeout 
          ? `AI分析超时（等待时间超过2分钟）。错误代码: ${errorCode}。LLM服务可能正在处理其他请求或负载较高，请稍后重试。`
          : `AI分析服务暂时不可用。错误代码: ${errorCode}`,
        fixDescription: isTimeout ? '建议：稍后重试或查看本地建议' : '请稍后重试或查看本地建议',
        originalCode: `// 第 ${lineNumber} 行存在问题`,
        fixedCode: isTimeout 
          ? '// LLM分析超时，建议：1) 稍后重试 2) 检查网络连接 3) 确认LLM服务状态'
          : '// 请等待AI服务恢复后获取详细修复建议'
      };
      setNodeExplanation(fallbackExplanation);
      setDrawerOpen(true);
    } finally {
      setIsLoadingLLM(false);
    }
  };

  // Context value
  const contextValue: AppContextType = {
    code,
    setCode,
    graph,
    lintErrors,
    selectedNode,
    nodeExplanation
  };

  // Intel品牌蓝色
  const intelBlue = '#0071c5';

  return (
    <AppContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* App Bar */}
          <AppBar position="static" sx={{ bgcolor: mode === 'dark' ? '#1A2027' : intelBlue }}>
            <Toolbar disableGutters sx={{ pl: 0.7 }}>
              <Box component="img" 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Intel_logo_%282006-2020%29.svg/200px-Intel_logo_%282006-2020%29.svg.png" 
                sx={{ height: 24, mr: 0.5 }}
                alt="Intel Logo"
              />
              <IntegrationInstructionsIcon sx={{ mr: 0.4, fontSize: 24 }} />
              <Typography variant="h6" component="div" sx={{ 
                flexGrow: 1, 
                fontFamily: 'Consolas, monospace',
                fontWeight: 'bold'
              }}>
                硬件设计端云AI协同平台
              </Typography>
              
              <Chip 
                icon={<MemoryIcon fontSize="small" />} 
                label="Intel® Core™ Ultra" 
                size="small" 
                sx={{ 
                  mr: 1,
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  '& .MuiChip-icon': { color: 'white' },
                  fontFamily: 'Consolas, monospace',
                  fontSize: '0.7rem'
                }}
              />
              
              <Chip 
                icon={<SpeedIcon fontSize="small" />} 
                label="AI PC" 
                size="small" 
                sx={{ 
                  mr: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  '& .MuiChip-icon': { color: 'white' },
                  fontFamily: 'Consolas, monospace',
                  fontSize: '0.7rem'
                }}
              />
              
              <IconButton 
                color="inherit" 
                onClick={toggleColorMode}
                aria-label="toggle dark mode"
              >
                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Toolbar>
          </AppBar>
          
          {/* Intel端云协同Banner */}
          <IntelArchBanner />
          
          {/* 本地模型状态 */}
          <LocalModelStatus 
            tinyBertLatency={tinyBertStatus.latency}
            llmLatency={llmStatus.latency}
            tinyBertConnected={tinyBertStatus.isConnected}
            llmConnected={llmStatus.isConnected}
            tinyBertError={tinyBertStatus.error}
            llmError={llmStatus.error}
            tinyBertWorking={isTinyBertWorking}
          />
          
          {/* Main Content */}
          <Grid container sx={{ flexGrow: 1, overflow: 'hidden' }}>
            {/* Left Pane - Editor */}
            <Grid item xs={6} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Paper 
                elevation={2} 
                sx={{ 
                  m: 1, 
                  flexGrow: 1, 
                  height: '100%',
                  overflow: 'hidden',
                  border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: 1
                }}
              >
                <EditorPane 
                  code={code} 
                  onChange={setCode} 
                  highlightedLine={highlightedLine}
                  lintErrors={lintErrors}
                  onEditingChange={setIsUserEditing}
                />
              </Paper>
            </Grid>
            
            {/* Right Pane - Graph + Errors */}
            <Grid item xs={6} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Paper 
                elevation={2} 
                sx={{ 
                  m: 1, 
                  flexGrow: 1,
                  height: 'calc(70% - 8px)',
                  overflow: 'hidden',
                  border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: 1
                }}
              >
                <GraphPane 
                  nodes={graph.nodes} 
                  edges={graph.edges} 
                  onNodeSelect={handleNodeSelect}
                  selectedNode={selectedNode}
                />
              </Paper>
              
              <Paper 
                elevation={2} 
                sx={{ 
                  m: 1, 
                  height: 'calc(30% - 8px)',
                  overflow: 'auto',
                  border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: 1
                }}
              >
                <ErrorList 
                  errors={lintErrors} 
                  onSelectLine={handleLineSelect}
                  onRequestLLMAnalysis={handleRequestLLMAnalysis}
                />
              </Paper>
            </Grid>
          </Grid>
          
          {/* Action Bar */}
          <Paper 
            elevation={3} 
            sx={{ 
              borderTop: 1, 
              borderColor: 'divider',
              height: 'auto',
              minHeight: '80px',
              maxHeight: '45%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              zIndex: 1
            }}
          >
            <ActionBar />
          </Paper>
          
          {/* Loading Indicators - 只保留LLM的加载指示器 */}
          <IntelLoadingIndicator 
            loading={isLoadingLLM} 
            loadingText="本地硬件设计专用LLM分析中...（Intel GPU/NPU加速，预计30-120秒）" 
          />
          
          {/* Explanation Drawer */}
          <ExplainDrawer 
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            explanation={nodeExplanation}
            onApplyFix={(_fixCode) => {
              // 使用智能代码替换而不是直接替换整个编辑器内容
              if (nodeExplanation) {
                const updatedCode = applyCodeFix(code, nodeExplanation);
                setCode(updatedCode);
              }
            }}
          />
        </Box>
      </ThemeProvider>
    </AppContext.Provider>
  );
}

export default App; 