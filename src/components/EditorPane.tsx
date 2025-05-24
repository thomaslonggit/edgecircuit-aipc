import { useRef, useState, useEffect } from 'react';
import { Box, Typography, Button, Popover } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Editor, { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { LintError } from '../utils/types';

// Define Verilog language basic syntax highlighting if Monaco doesn't have it
const configureVerilogLanguage = (monaco: Monaco) => {
  // Register Verilog language if it doesn't exist
  monaco.languages.register({ id: 'verilog' });
  
  // Define basic syntax highlighting
  monaco.languages.setMonarchTokensProvider('verilog', {
    keywords: [
      'module', 'endmodule', 'input', 'output', 'inout', 'wire', 'reg',
      'always', 'begin', 'end', 'if', 'else', 'case', 'endcase', 'default',
      'assign', 'parameter', 'localparam', 'posedge', 'negedge'
    ],
    operators: [
      '=', '==', '!=', '&&', '||', '&', '|', '^', '~', '<<', '>>',
      '+', '-', '*', '/', '%', '<', '>', '<=', '>=', '?', ':', '!'
    ],
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    tokenizer: {
      root: [
        [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
        { include: '@whitespace' },
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/\d+/, 'number'],
        [/[;,.]/, 'delimiter'],
      ],
      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
      ],
      comment: [
        [/[^\/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment'],
      ],
    },
  });
};

interface EditorPaneProps {
  code: string;
  onChange: (code: string) => void;
  highlightedLine?: number | null;
  lintErrors?: LintError[];
}

const EditorPane: React.FC<EditorPaneProps> = ({ 
  code, 
  onChange, 
  highlightedLine,
  lintErrors = [] 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const [errorPopover, setErrorPopover] = useState<{
    open: boolean;
    anchorEl: HTMLElement | null;
    error: LintError | null;
    position: { lineNumber: number; column: number } | null;
  }>({
    open: false,
    anchorEl: null,
    error: null,
    position: null
  });
  
  // Handle editor mounting
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    configureVerilogLanguage(monaco);
    
    // Add click handler for error lines
    editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS ||
          e.target.type === monaco.editor.MouseTargetType.CONTENT_TEXT) {
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber) {
          const error = lintErrors.find(err => err.line === lineNumber);
          if (error) {
            // Get DOM element for the line
            const lineElement = editor.getDomNode()?.querySelector(
              `.view-line[data-line-number="${lineNumber}"]`
            );
            
            if (lineElement) {
              setErrorPopover({
                open: true,
                anchorEl: lineElement as HTMLElement,
                error: error,
                position: { lineNumber, column: 1 }
              });
            }
          }
        }
      }
    });
    
    // If a line is highlighted on mount, scroll to it
    if (highlightedLine) {
      highlightLine(highlightedLine);
    }
  };
  
  // Apply error decorations when lintErrors change
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    
    // Remove old decorations
    if (decorationsRef.current.length) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
    
    // Create new decorations for errors
    if (lintErrors.length) {
      const errorDecorations = lintErrors.map(error => ({
        range: new monacoRef.current!.Range(
          error.line, 
          1,
          error.line,
          1000
        ),
        options: {
          isWholeLine: true,
          className: error.severity === 'error' ? 'errorLineDecoration' : 'warningLineDecoration',
          marginClassName: error.severity === 'error' ? 'errorLineMargin' : 'warningLineMargin',
          hoverMessage: { value: error.message },
          glyphMarginClassName: error.severity === 'error' ? 'errorGlyphMargin' : 'warningGlyphMargin',
          glyphMarginHoverMessage: { value: `点击查看详细信息: ${error.message}` }
        }
      }));
      
      decorationsRef.current = editorRef.current.deltaDecorations([], errorDecorations);
    }
  }, [lintErrors]);
  
  // 初始加载时应用错误装饰和高亮
  useEffect(() => {
    // 当编辑器和错误数据都已加载时执行
    if (editorRef.current && monacoRef.current && lintErrors.length > 0 && highlightedLine) {
      // 应用错误装饰
      const errorDecorations = lintErrors.map(error => ({
        range: new monacoRef.current!.Range(
          error.line, 
          1,
          error.line,
          1000
        ),
        options: {
          isWholeLine: true,
          className: error.severity === 'error' ? 'errorLineDecoration' : 'warningLineDecoration',
          marginClassName: error.severity === 'error' ? 'errorLineMargin' : 'warningLineMargin',
          hoverMessage: { value: error.message },
          glyphMarginClassName: error.severity === 'error' ? 'errorGlyphMargin' : 'warningGlyphMargin',
          glyphMarginHoverMessage: { value: `点击查看详细信息: ${error.message}` }
        }
      }));
      
      decorationsRef.current = editorRef.current.deltaDecorations([], errorDecorations);
      
      // 高亮第一个错误行
      highlightLine(highlightedLine);
    }
  }, [lintErrors, highlightedLine]);
  
  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onChange(content);
      };
      reader.readAsText(file);
    }
  };
  
  // Handle drag & drop events
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files[0];
    if (file && file.name.endsWith('.v')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onChange(content);
      };
      reader.readAsText(file);
    }
  };
  
  // Highlight and scroll to a specific line
  const highlightLine = (lineNumber: number) => {
    if (!editorRef.current) return;
    
    editorRef.current.revealLineInCenter(lineNumber);
    editorRef.current.setSelection({
      startLineNumber: lineNumber,
      startColumn: 1,
      endLineNumber: lineNumber,
      endColumn: 1
    });
  };
  
  // Update highlight when the highlightedLine prop changes
  useEffect(() => {
    if (highlightedLine && editorRef.current) {
      highlightLine(highlightedLine);
    }
  }, [highlightedLine]);
  
  // Handle popover close
  const handlePopoverClose = () => {
    setErrorPopover({
      open: false,
      anchorEl: null,
      error: null,
      position: null
    });
  };
  
  return (
    <Box 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
        border: isDragging ? '2px dashed #1976d2' : 'none',
        '& .errorLineDecoration': {
          backgroundColor: 'rgba(255, 0, 0, 0.2)',
          cursor: 'pointer',
          textDecoration: 'wavy underline rgba(255, 0, 0, 0.7)'
        },
        '& .warningLineDecoration': {
          backgroundColor: 'rgba(255, 165, 0, 0.2)',
          cursor: 'pointer',
          textDecoration: 'wavy underline rgba(255, 165, 0, 0.7)'
        },
        '& .errorLineMargin': {
          display: 'none'
        },
        '& .warningLineMargin': {
          display: 'none'
        },
        '& .errorGlyphMargin': {
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' width=\'16\' height=\'16\'%3E%3Cpath fill=\'%23FF5555\' d=\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z\'/%3E%3C/svg%3E")',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          cursor: 'pointer'
        },
        '& .warningGlyphMargin': {
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' width=\'16\' height=\'16\'%3E%3Cpath fill=\'%23FFA500\' d=\'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z\'/%3E%3C/svg%3E")',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          cursor: 'pointer'
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: 1,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Typography variant="subtitle1">Verilog 编辑器</Typography>
        <Button
          component="label"
          variant="outlined"
          startIcon={<UploadFileIcon />}
          size="small"
        >
          上传文件
          <input
            type="file"
            accept=".v"
            hidden
            onChange={handleFileUpload}
          />
        </Button>
      </Box>
      
      <Box sx={{ flexGrow: 1 }}>
        <Editor
          height="100%"
          language="verilog"
          value={code}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            lineDecorationsWidth: 10,
          }}
        />
      </Box>
      
      {/* Error Details Popover */}
      <Popover
        open={errorPopover.open}
        anchorEl={errorPopover.anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{
          '& .MuiPaper-root': {
            padding: 2,
            maxWidth: 400,
            borderLeft: 4,
            borderColor: errorPopover.error?.severity === 'error' ? '#FF5555' : '#FFA500',
          }
        }}
      >
        {errorPopover.error && (
          <Box>
            <Typography variant="subtitle2" color={errorPopover.error.severity === 'error' ? 'error' : 'warning'}>
              {errorPopover.error.severity === 'error' ? '错误' : '警告'} (行 {errorPopover.error.line})
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {errorPopover.error.message}
            </Typography>
            <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
              点击此处以定位到问题行
            </Typography>
          </Box>
        )}
      </Popover>
      
      {/* Overlay message when dragging a file */}
      {isDragging && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1,
          }}
        >
          <Typography variant="h6">拖放 Verilog (.v) 文件到此处</Typography>
        </Box>
      )}
    </Box>
  );
};

export default EditorPane; 