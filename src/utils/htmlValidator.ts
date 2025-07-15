interface ValidationResult {
  isValid: boolean;
  errors: {
    structure?: string[];
    content?: string[];
    d3?: string[];
    quality?: string[];
    variables?: string[];
  };
}

export const validateHtml = (content: string): ValidationResult => {
  // 清理內容，移除瀏覽器插件注入的元素
  const cleanContent = content
    .replace(/<script src="chrome-extension:\/\/.*?><\/script>/g, '')
    .replace(/<[^>]*(?:katalonextensionid|grammarly|data-gr-)[^>]*>/g, '')
    .replace(/<!--[\s\S]*?-->/g, ''); // 移除註釋

  const errors: ValidationResult['errors'] = {};

  // 基本結構檢查
  const structureChecks = {
    hasDoctype: /<!DOCTYPE html>\s*<html[^>]*>[\s\S]*<\/html>/i.test(cleanContent),
    hasHeadAndBody: /<head>[\s\S]*<\/head>\s*<body[^>]*>[\s\S]*<\/body>/i.test(cleanContent),
    hasMetaTags: /<meta\s+charset=["']utf-8["']\s*\/?>/.test(cleanContent),
    hasD3Import: /<script\s+src=["']https:\/\/d3js\.org\/d3\.v[0-9]+\.min\.js["']\s*><\/script>/.test(cleanContent)
  };

  // 內容元素檢查
  const contentChecks = {
    hasContainer: /<div[^>]+id=["'][^"']+["'][^>]*>/.test(cleanContent),
    hasSvgElement: /svg/.test(cleanContent)
  };

  // D3.js代碼品質檢查
  const d3Checks = {
    hasValidSelection: /d3\.select\(["']#[^"']+["']\)/.test(cleanContent),
    hasSvgDimensions: content.includes('.attr("width",') && content.includes('.attr("height",'),
    // hasScales: /d3\.scale(Linear|Band|Ordinal|Time)\(\)/.test(cleanContent) ||
    //            /d3\.(scaleLinear|scaleBand|scaleOrdinal|scaleTime)\(\)/.test(cleanContent),
    // hasAxes: /d3\.axis(Left|Right|Top|Bottom)\(/.test(cleanContent) ||
    //          /\.call\(d3\.axis(Left|Right|Top|Bottom)\(/.test(cleanContent),
    hasChartAttributes: /\.attr\(["'](x|y|width|height|r|d)["']/.test(cleanContent)
  };

  // 代碼質量檢查
  const qualityChecks = {
    hasProperVariables: !(/\bvar\b/.test(cleanContent)) && 
                        /\b(const|let)\s+\w+\s*=/.test(cleanContent),
    hasSyntaxErrors: /\.\.(?:append|attr|style)/.test(cleanContent) || 
                     /\.atttr=/.test(cleanContent) || 
                     /\batttr=['"]/.test(cleanContent) || 
                     /&quot;|&amp;|&lt;|&gt;/.test(cleanContent),
    hasIncompleteFunctions: /function\s+\w+\s*\([^)]*\)\s*{\s*(?:(?!\}).)*$/.test(cleanContent),

  };

  // 檢查未定義的變量
  const checkUndefinedVars = (variable: string): boolean => {
    const declaration = new RegExp(`\\b(const|let)\\s+${variable}\\b`);
    const usage = new RegExp(`\\b${variable}\\b`);
    return usage.test(cleanContent) && !declaration.test(cleanContent);
  };

  // 收集錯誤
  const structureErrors = Object.entries(structureChecks)
    .filter(([, isValid]) => !isValid)
    .map(([key]) => {
      const errorMessages: { [key: string]: string } = {
        hasDoctype: '缺少 DOCTYPE 或 HTML 結構不完整',
        hasHeadAndBody: '缺少 head 或 body 標籤',
        hasMetaTags: '缺少 UTF-8 meta 標籤',
        hasD3Import: '缺少 D3.js 引入'
      };
      return errorMessages[key];
    });

  const contentErrors = Object.entries(contentChecks)
    .filter(([, isValid]) => !isValid)
    .map(([key]) => {
      const errorMessages: { [key: string]: string } = {
        hasContainer: '缺少帶 ID 的容器元素',
        hasSvgElement: '缺少帶尺寸的 SVG 元素'
      };
      return errorMessages[key];
    });

  const d3Errors = Object.entries(d3Checks)
    .filter(([, isValid]) => !isValid)
    .map(([key]) => {
      const errorMessages: { [key: string]: string } = {
        hasValidSelection: '缺少有效的 D3 選擇器',
        hasSvgDimensions: '缺少 SVG 尺寸設置',
        hasScales: '缺少比例尺定義',
        hasAxes: '缺少座標軸定義',
        hasDataBinding: '缺少數據綁定',
        hasChartAttributes: '缺少必要的圖表屬性'
      };
      return errorMessages[key];
    });

  const qualityErrors = Object.entries(qualityChecks)
    .filter(([key, isValid]) => key !== 'hasProperVariables' && isValid)
    .map(([key]) => {
      const errorMessages: { [key: string]: string } = {
        hasSyntaxErrors: '存在語法錯誤',
        hasIncompleteFunctions: '存在不完整的函數定義',
        hasFormattingIssues: '存在格式問題'
      };
      return errorMessages[key];
    });

  if (!qualityChecks.hasProperVariables) {
    qualityErrors.push('變量聲明不正確（應使用 const/let）');
  }

  // 檢查常見變量
  const commonVars = ['width', 'height', 'margin', 'data', 'svg', 'x', 'y'];
  const undefinedVars = commonVars.filter(checkUndefinedVars);
  const variableErrors = undefinedVars.map(v => `變量 '${v}' 未定義`);

  // 收集所有錯誤
  if (structureErrors.length) errors.structure = structureErrors;
  if (contentErrors.length) errors.content = contentErrors;
  if (d3Errors.length) errors.d3 = d3Errors;
  if (qualityErrors.length) errors.quality = qualityErrors;
  if (variableErrors.length) errors.variables = variableErrors;

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}; 