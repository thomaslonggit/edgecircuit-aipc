import { useEffect, useRef, useState } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { Node, Edge } from '../utils/types';

// Register the dagre layout extension
cytoscape.use(dagre);

interface GraphPaneProps {
  nodes: Node[];
  edges: Edge[];
  onNodeSelect: (node: Node) => void;
  selectedNode: Node | null;
}

const GraphPane: React.FC<GraphPaneProps> = ({ nodes, edges, onNodeSelect, selectedNode }) => {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [elements, setElements] = useState<cytoscape.ElementDefinition[]>([]);
  const [layoutSettings, setLayoutSettings] = useState({
    rankDir: 'LR' as 'LR' | 'TB' | 'RL' | 'BT',
    rankSep: 120,
    nodeSep: 80,
    edgeSep: 15,
    padding: 40
  });
  
  // Transform nodes and edges to cytoscape format
  useEffect(() => {
    const cyElements: cytoscape.ElementDefinition[] = [];
    
    // Add nodes
    nodes.forEach(node => {
      cyElements.push({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          isBug: node.isBug || false,
          originalId: node.id.split('_')[1] || node.id
        },
        classes: node.isBug ? 'bug' : ''
      });
    });
    
    // Add edges
    edges.forEach(edge => {
      cyElements.push({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label || '',
          width: edge.width || 1 // Support for bus width visualization
        }
      });
    });
    
    setElements(cyElements);
  }, [nodes, edges]);
  
  // Update selected node
  useEffect(() => {
    if (!cyRef.current) return;
    
    // Remove previous selection
    cyRef.current.elements().removeClass('selected');
    
    // Add selection to the selected node
    if (selectedNode) {
      const selectedEle = cyRef.current.getElementById(selectedNode.id);
      if (selectedEle) {
        selectedEle.addClass('selected');
        // Center the graph on the selected node
        cyRef.current.animate({
          fit: {
            eles: selectedEle,
            padding: 50
          },
          duration: 500
        });
      }
    }
  }, [selectedNode]);
  
  // Apply layout when elements or layout settings change
  useEffect(() => {
    if (!cyRef.current || elements.length === 0) return;
    
    // Run layout
    const layout = cyRef.current.layout({
      name: 'dagre',
      rankDir: layoutSettings.rankDir,
      nodeDimensionsIncludeLabels: true,
      rankSep: layoutSettings.rankSep,
      nodeSep: layoutSettings.nodeSep,
      edgeSep: layoutSettings.edgeSep,
      fit: true,
      padding: layoutSettings.padding,
      animate: true,
      animationDuration: 500
    });
    
    layout.run();
  }, [elements, layoutSettings]);
  
  // Define graph layout and style
  const layout = {
    name: 'dagre',
    rankDir: layoutSettings.rankDir,
    nodeDimensionsIncludeLabels: true,
    rankSep: layoutSettings.rankSep,
    nodeSep: layoutSettings.nodeSep,
    edgeSep: layoutSettings.edgeSep,
    fit: true,
    padding: layoutSettings.padding,
    animate: true
  };
  
  const stylesheet: cytoscape.Stylesheet[] = [
    {
      selector: 'node',
      style: {
        'background-color': '#D9E5FF',
        'label': 'data(originalId)',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': 100,
        'height': 50,
        'shape': 'roundrectangle',
        'font-size': 14,
        'font-weight': 'bold',
        'font-family': 'Consolas, monospace',
        'text-wrap': 'wrap',
        'text-max-width': 90,
        'border-width': 2,
        'border-color': '#2C3E50',
        'border-opacity': 0.9,
        'box-shadow': '0 2px 5px rgba(0,0,0,0.2)',
        'color': '#1A1A1A',
        'text-outline-width': 2,
        'text-outline-color': '#FFFFFF',
        'text-outline-opacity': 0.8,
      }
    },
    {
      selector: 'node[type="input"]',
      style: {
        'background-color': '#B3D9FF',
        'shape': 'round-rectangle',
        'border-style': 'dashed',
        'border-width': 2,
        'border-color': '#1A5276',
        'height': 40,
        'width': 90
      }
    },
    {
      selector: 'node[type="output"]',
      style: {
        'background-color': '#FFD2B3',
        'shape': 'round-rectangle',
        'border-style': 'dashed',
        'border-width': 2,
        'border-color': '#7E5109',
        'height': 40,
        'width': 90
      }
    },
    {
      selector: 'node[type="register"]',
      style: {
        'background-color': '#E6CCFF',
        'shape': 'rectangle',
        'border-width': 3,
        'border-color': '#4A235A',
        'width': 110,
        'height': 45
      }
    },
    {
      selector: 'node[type="module"]',
      style: {
        'background-color': '#E5E8E8',
        'shape': 'roundrectangle',
        'width': 120,
        'height': 60,
        'border-width': 2,
        'border-color': '#2C3E50'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 'data(width)',
        'line-color': '#34495E',
        'target-arrow-color': '#34495E',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'source-endpoint': 'outside-to-node-or-label',
        'target-endpoint': 'outside-to-node-or-label',
        'arrow-scale': 1.3,
        'line-style': 'solid',
        'edge-distances': 'node-position'
      }
    },
    {
      selector: 'edge[width > 1]',
      style: {
        'width': 3,
        'line-style': 'solid',
        'line-color': '#2471A3',
        'target-arrow-color': '#2471A3',
      }
    },
    {
      selector: 'edge:selected',
      style: {
        'width': 3,
        'line-color': '#1A5276',
        'target-arrow-color': '#1A5276',
        'line-style': 'solid',
        'z-index': 10
      }
    },
    {
      selector: '.selected',
      style: {
        'border-width': 4,
        'border-color': '#2980B9',
        'border-style': 'solid',
        'box-shadow': '0 0 12px #2980B9',
        'z-index': 10
      }
    },
    {
      selector: '.bug',
      style: {
        'background-color': '#FADBD8',
        'border-width': 4,
        'border-color': '#C0392B',
        'border-style': 'dashed',
        'border-opacity': 1,
        'background-opacity': 0.9,
        'transition-property': 'background-opacity',
        'transition-duration': '0.5s',
        'transition-timing-function': 'ease-in-out',
        'transition-delay': '0.1s'
      }
    }
  ];
  
  // Handle graph initialization
  const handleCytoscapeRef = (cy: cytoscape.Core) => {
    cyRef.current = cy;
    
    // Register node click event
    cy.on('tap', 'node', event => {
      const nodeId = event.target.id();
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        onNodeSelect(node);
      }
    });
    
    // Enable mouse wheel zoom
    cy.on('mousewheel', (event) => {
      event.preventDefault();
    });
    
    // Initial fit
    cy.fit(undefined, 30);
  };
  
  const handleZoomFit = () => {
    if (!cyRef.current) return;
    cyRef.current.fit(undefined, 30);
  };
  
  // Layout controls
  const toggleDirection = () => {
    setLayoutSettings(prev => ({
      ...prev,
      rankDir: prev.rankDir === 'LR' ? 'TB' : 'LR'
    }));
  };
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: 1,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1A2027' : '#E1F5FE'
      }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontFamily: 'Consolas, monospace' }}>
          寄存器传输级(RTL)架构图
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ mr: 1, fontFamily: 'Consolas, monospace' }}>
            模块数: {nodes.length} | 连接数: {edges.length}
          </Typography>
          <Tooltip title="切换布局方向">
            <IconButton 
              size="small" 
              onClick={toggleDirection}
              sx={{ mr: 0.5 }}
            >
              {layoutSettings.rankDir === 'LR' 
                ? <span style={{ fontSize: '14px', fontWeight: 'bold' }}>↔</span> 
                : <span style={{ fontSize: '14px', fontWeight: 'bold' }}>↕</span>}
            </IconButton>
          </Tooltip>
          <Tooltip title="适应窗口">
            <IconButton size="small" onClick={handleZoomFit}>
              <FitScreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {elements.length > 0 ? (
        <CytoscapeComponent
          elements={elements}
          stylesheet={stylesheet}
          layout={layout}
          cy={handleCytoscapeRef}
          style={{
            width: '100%',
            height: '100%',
          }}
          wheelSensitivity={0.2}
        />
      ) : (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%',
          color: 'text.secondary'
        }}>
          <Typography>加载RTL架构图...</Typography>
        </Box>
      )}
    </Box>
  );
};

export default GraphPane; 