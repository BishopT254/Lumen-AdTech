// @/components/ui/chart.tsx
import React, { useMemo, ReactNode, createContext, useContext } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  TooltipProps,
  LegendProps,
  XAxisProps,
  YAxisProps,
  CartesianGridProps,
  LineProps,
  BarProps,
} from 'recharts';

// Original Chart types (maintaining backward compatibility)
export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'radar' | 'scatter';

// Base props for all chart types (maintaining backward compatibility)
export interface BaseChartProps {
  data: any[];
  width?: number | string;
  height?: number | string;
  className?: string;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  showTooltip?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  legendPosition?: 'top' | 'right' | 'bottom' | 'left';
  colors?: string[];
}

// Original props (maintaining backward compatibility)
export interface CartesianChartProps extends BaseChartProps {
  xAxisDataKey: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  dataKeys: string[];
  dataKeyLabels?: Record<string, string>;
  strokeWidth?: number;
  xAxisTickFormatter?: (value: any) => string;
  yAxisTickFormatter?: (value: any) => string;
  tooltipFormatter?: (value: any, name: string) => string | [string, string];
  stacked?: boolean;
}

export interface PieChartProps extends BaseChartProps {
  dataKey: string;
  nameKey: string;
  innerRadius?: number | string;
  outerRadius?: number | string;
  labelLine?: boolean;
  label?: boolean | ((props: any) => React.ReactNode);
}

export interface RadarChartProps extends BaseChartProps {
  dataKeys: string[];
  dataKeyLabels?: Record<string, string>;
  angleDataKey: string;
}

export interface ScatterChartProps extends BaseChartProps {
  xDataKey: string;
  yDataKey: string;
  zDataKey?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xAxisTickFormatter?: (value: any) => string;
  yAxisTickFormatter?: (value: any) => string;
}

export type ChartProps = (
  | ({ type: 'line' | 'bar' | 'area' } & CartesianChartProps)
  | ({ type: 'pie' } & PieChartProps)
  | ({ type: 'radar' } & RadarChartProps)
  | ({ type: 'scatter' } & ScatterChartProps)
);

// Default colors
const DEFAULT_COLORS = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
];

// New composable components
interface ChartContainerProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  children: ReactNode;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  width = '100%',
  height = 400,
  className = '',
  margin = { top: 20, right: 20, bottom: 20, left: 20 },
  children,
}) => {
  return (
    <ResponsiveContainer width={width} height={height} className={className}>
      {children}
    </ResponsiveContainer>
  );
};

// Type for the chart context
interface ChartContextType {
  data: any[];
  colors: string[];
}

// Create context to share data and colors between chart components
const ChartContext = createContext<ChartContextType | undefined>(undefined);

// ChartProvider to make chart data available to all child components
interface ChartProviderProps {
  data: any[];
  colors?: string[];
  children: ReactNode;
}

export const ChartProvider: React.FC<ChartProviderProps> = ({ 
  data, 
  colors = DEFAULT_COLORS, 
  children 
}) => {
  const chartColors = useMemo(() => {
    return colors.length > 0 ? colors : DEFAULT_COLORS;
  }, [colors]);

  return (
    <ChartContext.Provider value={{ data, colors: chartColors }}>
      {children}
    </ChartContext.Provider>
  );
};

// Hook to use chart context
const useChartContext = () => {
  const context = useContext(ChartContext);
  if (context === undefined) {
    throw new Error('useChartContext must be used within a ChartProvider');
  }
  return context;
};

// Different chart type containers
interface CartesianChartContainerProps {
  children: ReactNode;
  layout?: 'horizontal' | 'vertical';
  data: any[]; // Add data property to ensure chart has data
}

// Fixed containers to always include the data
export const LineChartContainer: React.FC<CartesianChartContainerProps> = ({ 
  children,
  layout = 'horizontal',
  data
}) => {
  return <LineChart data={data} layout={layout}>{children}</LineChart>;
};

export const BarChartContainer: React.FC<CartesianChartContainerProps> = ({ 
  children,
  layout = 'horizontal',
  data
}) => {
  return <BarChart data={data} layout={layout}>{children}</BarChart>;
};

export const AreaChartContainer: React.FC<CartesianChartContainerProps> = ({ 
  children,
  layout = 'horizontal',
  data
}) => {
  return <AreaChart data={data} layout={layout}>{children}</AreaChart>;
};

interface PieChartContainerProps {
  children: ReactNode;
  data?: any[]; // Make data optional for PieChart
}

export const PieChartContainer: React.FC<PieChartContainerProps> = ({ 
  children,
  data = []
}) => {
  // PieChart doesn't require data at the container level
  return <PieChart>{children}</PieChart>;
};

interface RadarChartContainerProps {
  children: ReactNode;
  data: any[];
}

export const RadarChartContainer: React.FC<RadarChartContainerProps> = ({
  children,
  data
}) => {
  return <RadarChart data={data}>{children}</RadarChart>;
};

interface ScatterChartContainerProps {
  children: ReactNode;
  data?: any[];
}

export const ScatterChartContainer: React.FC<ScatterChartContainerProps> = ({
  children,
  data = []
}) => {
  return <ScatterChart>{children}</ScatterChart>;
};

// Chart elements
interface ChartTooltipProps extends Partial<TooltipProps> {
  formatter?: (value: any, name: string) => string | [string, string];
}

export const ChartTooltip: React.FC<ChartTooltipProps> = (props) => {
  return <Tooltip {...props} />;
};

interface ChartLegendProps extends Partial<LegendProps> {
  position?: 'top' | 'right' | 'bottom' | 'left';
}

export const ChartLegend: React.FC<ChartLegendProps> = ({ 
  position = 'bottom', 
  ...props 
}) => {
  return (
    <Legend 
      layout={position === 'left' || position === 'right' ? 'vertical' : 'horizontal'} 
      verticalAlign={position === 'bottom' || position === 'top' ? position : 'middle'} 
      align={position === 'right' || position === 'left' ? position : 'center'} 
      {...props} 
    />
  );
};

export const ChartGrid: React.FC<Partial<CartesianGridProps>> = (props) => {
  return <CartesianGrid strokeDasharray="3 3" {...props} />;
};

interface ChartXAxisProps extends Partial<XAxisProps> {
  dataKey: string;
  label?: string;
  tickFormatter?: (value: any) => string;
}

export const ChartXAxis: React.FC<ChartXAxisProps> = ({ 
  dataKey, 
  label, 
  tickFormatter, 
  ...props 
}) => {
  return (
    <XAxis 
      dataKey={dataKey} 
      label={label ? { value: label, position: 'insideBottom', offset: -5 } : undefined}
      tickFormatter={tickFormatter}
      {...props} 
    />
  );
};

interface ChartYAxisProps extends Partial<YAxisProps> {
  label?: string;
  tickFormatter?: (value: any) => string;
}

export const ChartYAxis: React.FC<ChartYAxisProps> = ({ 
  label, 
  tickFormatter, 
  ...props 
}) => {
  return (
    <YAxis 
      label={label ? { value: label, angle: -90, position: 'insideLeft' } : undefined}
      tickFormatter={tickFormatter}
      {...props} 
    />
  );
};

interface ChartLineProps extends Partial<LineProps> {
  dataKey: string;
  name?: string;
  index?: number;
  strokeWidth?: number;
}

export const ChartLine: React.FC<ChartLineProps> = ({ 
  dataKey, 
  name, 
  index = 0, 
  strokeWidth = 2, 
  ...props 
}) => {
  const { colors } = useChartContext();
  const color = colors[index % colors.length];
  
  return (
    <Line 
      type="monotone" 
      dataKey={dataKey}
      name={name || dataKey}
      stroke={color}
      strokeWidth={strokeWidth}
      activeDot={{ r: 8 }}
      {...props}
    />
  );
};

interface ChartBarProps extends Partial<BarProps> {
  dataKey: string;
  name?: string;
  index?: number;
  stacked?: boolean;
}

export const ChartBar: React.FC<ChartBarProps> = ({ 
  dataKey, 
  name, 
  index = 0, 
  stacked = false, 
  ...props 
}) => {
  const { colors } = useChartContext();
  const color = colors[index % colors.length];
  const stackProps = stacked ? { stackId: 'stack' } : {};
  
  return (
    <Bar 
      dataKey={dataKey}
      name={name || dataKey}
      fill={color}
      {...stackProps}
      {...props}
    />
  );
};

interface ChartPieProps {
  dataKey: string;
  nameKey: string;
  data?: any[]; // Add data property to ensure pie has data
  innerRadius?: number | string;
  outerRadius?: number | string;
  cx?: string | number;
  cy?: string | number;
  labelLine?: boolean;
  label?: boolean | ((props: any) => React.ReactNode);
}

export const ChartPie: React.FC<ChartPieProps> = ({ 
  dataKey, 
  nameKey, 
  data, // Use provided data or fall back to context
  innerRadius = 0,
  outerRadius = '80%',
  cx = '50%',
  cy = '50%',
  labelLine = true,
  label = true,
  ...props 
}) => {
  const context = useContext(ChartContext);
  // Use provided data if available, otherwise try to use context data
  const pieData = data || (context ? context.data : []);
  const colors = context ? context.colors : DEFAULT_COLORS;
  
  return (
    <Pie
      data={pieData}
      dataKey={dataKey}
      nameKey={nameKey}
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      labelLine={labelLine}
      label={label}
      {...props}
    >
      {pieData && pieData.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
      ))}
    </Pie>
  );
};

// Export Cell directly from recharts
export { Cell } from 'recharts';

interface ChartAreaProps {
  dataKey: string;
  name?: string;
  index?: number;
  strokeWidth?: number;
  stacked?: boolean;
}

export const ChartArea: React.FC<ChartAreaProps> = ({ 
  dataKey, 
  name, 
  index = 0, 
  strokeWidth = 2,
  stacked = false,
  ...props 
}) => {
  const { colors } = useChartContext();
  const color = colors[index % colors.length];
  const stackProps = stacked ? { stackId: 'stack' } : {};
  
  return (
    <Area 
      type="monotone" 
      dataKey={dataKey}
      name={name || dataKey}
      stroke={color}
      fill={color}
      strokeWidth={strokeWidth}
      {...stackProps}
      {...props}
    />
  );
};

// Create a composable chart API
export const ComposableChart = {
  Container: ChartContainer,
  Provider: ChartProvider,
  LineChart: LineChartContainer,
  BarChart: BarChartContainer,
  AreaChart: AreaChartContainer,
  PieChart: PieChartContainer,
  RadarChart: RadarChartContainer,
  ScatterChart: ScatterChartContainer,
  Line: ChartLine,
  Bar: ChartBar,
  Area: ChartArea,
  Pie: ChartPie,
  XAxis: ChartXAxis,
  YAxis: ChartYAxis,
  Grid: ChartGrid,
  Tooltip: ChartTooltip,
  Legend: ChartLegend,
  Cell
};

// Keep the original Chart component for backward compatibility
const Chart: React.FC<ChartProps> = (props) => {
  const {
    type,
    data,
    width = '100%',
    height = 400,
    className = '',
    margin = { top: 20, right: 20, bottom: 20, left: 20 },
    showTooltip = true,
    showLegend = true,
    showGrid = true,
    legendPosition = 'bottom',
    colors = DEFAULT_COLORS,
  } = props;

  // Determine the colors to use for the chart elements
  const chartColors = useMemo(() => {
    return colors.length > 0 ? colors : DEFAULT_COLORS;
  }, [colors]);

  const renderCartesianChart = (chartProps: CartesianChartProps) => {
    const {
      xAxisDataKey,
      dataKeys = [],
      dataKeyLabels = {},
      xAxisLabel,
      yAxisLabel,
      strokeWidth = 2,
      xAxisTickFormatter,
      yAxisTickFormatter,
      tooltipFormatter,
      stacked = false,
    } = chartProps;

    const ChartComponent = {
      line: LineChart,
      bar: BarChart,
      area: AreaChart,
    }[type];

    const DataElementComponent = {
      line: Line,
      bar: Bar,
      area: Area,
    }[type];

    const stackProps = stacked ? { stackId: 'stack' } : {};

    return (
      <ResponsiveContainer width={width} height={height} className={className}>
        <ChartComponent data={data} margin={margin}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis 
            dataKey={xAxisDataKey} 
            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
            tickFormatter={xAxisTickFormatter}
          />
          <YAxis 
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined} 
            tickFormatter={yAxisTickFormatter}
          />
          {showTooltip && <Tooltip formatter={tooltipFormatter} />}
          {showLegend && <Legend layout="horizontal" verticalAlign={legendPosition === 'bottom' || legendPosition === 'top' ? legendPosition : 'bottom'} align={legendPosition === 'right' || legendPosition === 'left' ? legendPosition : 'center'} />}
          
          {dataKeys && dataKeys.map((dataKey, index) => (
            <DataElementComponent
              key={dataKey}
              type="monotone"
              dataKey={dataKey}
              name={dataKeyLabels[dataKey] || dataKey}
              stroke={chartColors[index % chartColors.length]}
              fill={chartColors[index % chartColors.length]}
              strokeWidth={strokeWidth}
              activeDot={{ r: 8 }}
              {...stackProps}
            />
          ))}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  const renderPieChart = (chartProps: PieChartProps) => {
    const {
      dataKey,
      nameKey,
      innerRadius = 0,
      outerRadius = '80%',
      labelLine = true,
      label = true,
    } = chartProps;

    return (
      <ResponsiveContainer width={width} height={height} className={className}>
        <PieChart margin={margin}>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            labelLine={labelLine}
            label={label}
          >
            {data && data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
            ))}
          </Pie>
          {showTooltip && <Tooltip />}
          {showLegend && <Legend layout="horizontal" verticalAlign={legendPosition === 'bottom' || legendPosition === 'top' ? legendPosition : 'bottom'} align={legendPosition === 'right' || legendPosition === 'left' ? legendPosition : 'center'} />}
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderRadarChart = (chartProps: RadarChartProps) => {
    const {
      dataKeys = [],
      dataKeyLabels = {},
      angleDataKey,
    } = chartProps;

    return (
      <ResponsiveContainer width={width} height={height} className={className}>
        <RadarChart outerRadius="80%" data={data} margin={margin}>
          <PolarGrid />
          <PolarAngleAxis dataKey={angleDataKey} />
          <PolarRadiusAxis />
          {dataKeys && dataKeys.map((dataKey, index) => (
            <Radar
              key={dataKey}
              name={dataKeyLabels[dataKey] || dataKey}
              dataKey={dataKey}
              stroke={chartColors[index % chartColors.length]}
              fill={chartColors[index % chartColors.length]}
              fillOpacity={0.6}
            />
          ))}
          {showTooltip && <Tooltip />}
          {showLegend && <Legend layout="horizontal" verticalAlign={legendPosition === 'bottom' || legendPosition === 'top' ? legendPosition : 'bottom'} align={legendPosition === 'right' || legendPosition === 'left' ? legendPosition : 'center'} />}
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  const renderScatterChart = (chartProps: ScatterChartProps) => {
    const {
      xDataKey,
      yDataKey,
      zDataKey,
      xAxisLabel,
      yAxisLabel,
      xAxisTickFormatter,
      yAxisTickFormatter,
    } = chartProps;

    return (
      <ResponsiveContainer width={width} height={height} className={className}>
        <ScatterChart margin={margin}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis 
            dataKey={xDataKey} 
            name={xAxisLabel} 
            tickFormatter={xAxisTickFormatter}
            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
          />
          <YAxis 
            dataKey={yDataKey} 
            name={yAxisLabel} 
            tickFormatter={yAxisTickFormatter}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
          />
          {showTooltip && <Tooltip cursor={{ strokeDasharray: '3 3' }} />}
          {showLegend && <Legend layout="horizontal" verticalAlign={legendPosition === 'bottom' || legendPosition === 'top' ? legendPosition : 'bottom'} align={legendPosition === 'right' || legendPosition === 'left' ? legendPosition : 'center'} />}
          <Scatter 
            name="Data Points" 
            data={data} 
            fill={chartColors[0]}
          >
            {data && data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={chartColors[index % chartColors.length]} 
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  };

  switch (type) {
    case 'line':
    case 'bar':
    case 'area':
      return renderCartesianChart(props as CartesianChartProps);
    case 'pie':
      return renderPieChart(props as PieChartProps);
    case 'radar':
      return renderRadarChart(props as RadarChartProps);
    case 'scatter':
      return renderScatterChart(props as ScatterChartProps);
    default:
      return <div className="text-red-500">Invalid chart type</div>;
  }
};

// Export the Chart component and all individual components
export { Chart };

