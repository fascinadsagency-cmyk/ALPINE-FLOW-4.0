import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { reportApi } from "@/lib/api";
import axios from "axios";
import { format, subYears, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { 
  BarChart3, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Loader2,
  CreditCard,
  Banknote,
  Globe,
  CalendarRange,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Download,
  Printer,
  Building2,
  Wrench
} from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Reports() {
  const [dateRange, setDateRange] = useState(null);
  const [report, setReport] = useState(null);
  const [previousYearReport, setPreviousYearReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    // Set initial range to current week
    const today = new Date();
    setDateRange({
      from: startOfWeek(today, { locale: es }),
      to: endOfWeek(today, { locale: es })
    });
  }, []);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      loadReport();
    }
  }, [dateRange, compareMode]);

  const loadReport = async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    setLoading(true);
    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');
      
      // Load current period report
      const response = await axios.get(`${API}/reports/range`, {
        params: { start_date: startDate, end_date: endDate },
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setReport(response.data);
      
      // Load previous year report if compare mode is active
      if (compareMode) {
        const prevYearStart = format(subYears(dateRange.from, 1), 'yyyy-MM-dd');
        const prevYearEnd = format(subYears(dateRange.to, 1), 'yyyy-MM-dd');
        
        const prevResponse = await axios.get(`${API}/reports/range`, {
          params: { start_date: prevYearStart, end_date: prevYearEnd },
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setPreviousYearReport(prevResponse.data);
      } else {
        setPreviousYearReport(null);
      }
    } catch (error) {
      toast.error("Error al cargar reporte");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const setQuickRange = (rangeType) => {
    const today = new Date();
    let from, to;
    
    switch (rangeType) {
      case 'week':
        from = startOfWeek(today, { locale: es });
        to = endOfWeek(today, { locale: es });
        break;
      case 'month':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'season':
        // Assuming season is Nov-Apr (adjust as needed)
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        if (currentMonth >= 10) {  // Nov-Dec
          from = new Date(currentYear, 10, 1);  // Nov 1st
          to = new Date(currentYear + 1, 3, 30);  // Apr 30th next year
        } else if (currentMonth <= 3) {  // Jan-Apr
          from = new Date(currentYear - 1, 10, 1);  // Nov 1st prev year
          to = new Date(currentYear, 3, 30);  // Apr 30th
        } else {  // Off season - default to current month
          from = startOfMonth(today);
          to = endOfMonth(today);
        }
        break;
      default:
        return;
    }
    
    setDateRange({ from, to });
    toast.success(`Rango actualizado: ${format(from, 'dd/MM', { locale: es })} - ${format(to, 'dd/MM', { locale: es })}`);
  };

  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return { percentage: 0, direction: 'neutral' };
    const growth = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(growth).toFixed(1),
      direction: growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral'
    };
  };

  const formatCurrency = (amount) => {
    return `€${amount.toFixed(2)}`;
  };

  const handlePrint = () => {
    window.print();
    toast.success("Generando documento para imprimir...");
  };

  const handleExportPDF = () => {
    // This would integrate with a PDF library in production
    toast.info("Exportación a PDF (función en desarrollo)");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8" data-testid="reports-page">
      {/* Header with Date Range Selector */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Reportes
            </h1>
            <p className="text-slate-500 mt-1">Análisis flexible por rangos y comparativa interanual</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleExportPDF}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Date Range Controls */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue-50">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Date Range Picker */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-5 w-5 text-primary" />
                  <Label className="font-semibold text-slate-700">Periodo:</Label>
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal border-2">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange?.from && dateRange?.to ? (
                        <>
                          {format(dateRange.from, 'dd MMM', { locale: es })} - {format(dateRange.to, 'dd MMM yyyy', { locale: es })}
                          <Badge variant="secondary" className="ml-2">
                            {differenceInDays(dateRange.to, dateRange.from) + 1} días
                          </Badge>
                        </>
                      ) : (
                        "Seleccionar rango"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Quick Selection Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickRange('week')}
                  className="text-xs"
                >
                  Esta Semana
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickRange('month')}
                  className="text-xs"
                >
                  Este Mes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickRange('season')}
                  className="text-xs"
                >
                  Toda la Temporada
                </Button>
              </div>

              {/* Compare Toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200">
                <Switch
                  checked={compareMode}
                  onCheckedChange={setCompareMode}
                  id="compare-mode"
                />
                <Label htmlFor="compare-mode" className="text-sm font-medium cursor-pointer">
                  Comparar con {dateRange?.from ? format(subYears(dateRange.from, 1), 'yyyy', { locale: es }) : 'año anterior'}
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {report && (
        <>
          {/* KPI Cards with Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Revenue */}
            <Card className={`border-slate-200 ${compareMode ? 'hover:shadow-lg transition-shadow' : ''}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500">Total Ingresos</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(report.total_revenue)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                {compareMode && previousYearReport && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                    {(() => {
                      const growth = calculateGrowth(report.total_revenue, previousYearReport.total_revenue);
                      return (
                        <>
                          {growth.direction === 'up' && <ArrowUpRight className="h-4 w-4 text-emerald-600" />}
                          {growth.direction === 'down' && <ArrowDownRight className="h-4 w-4 text-red-600" />}
                          {growth.direction === 'neutral' && <Minus className="h-4 w-4 text-slate-400" />}
                          <span className={`text-sm font-semibold ${
                            growth.direction === 'up' ? 'text-emerald-600' :
                            growth.direction === 'down' ? 'text-red-600' : 'text-slate-500'
                          }`}>
                            {growth.direction === 'up' ? '+' : growth.direction === 'down' ? '-' : ''}{growth.percentage}%
                          </span>
                          <span className="text-xs text-slate-500">vs año anterior</span>
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* New Rentals */}
            <Card className={`border-slate-200 ${compareMode ? 'hover:shadow-lg transition-shadow' : ''}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500">Nuevos Alquileres</p>
                    <p className="text-2xl font-bold text-slate-900">{report.new_rentals}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                {compareMode && previousYearReport && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                    {(() => {
                      const growth = calculateGrowth(report.new_rentals, previousYearReport.new_rentals);
                      return (
                        <>
                          {growth.direction === 'up' && <ArrowUpRight className="h-4 w-4 text-emerald-600" />}
                          {growth.direction === 'down' && <ArrowDownRight className="h-4 w-4 text-red-600" />}
                          {growth.direction === 'neutral' && <Minus className="h-4 w-4 text-slate-400" />}
                          <span className={`text-sm font-semibold ${
                            growth.direction === 'up' ? 'text-emerald-600' :
                            growth.direction === 'down' ? 'text-red-600' : 'text-slate-500'
                          }`}>
                            {growth.direction === 'up' ? '+' : growth.direction === 'down' ? '-' : ''}{growth.percentage}%
                          </span>
                          <span className="text-xs text-slate-500">vs año anterior</span>
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Returns */}
            <Card className={`border-slate-200 ${compareMode ? 'hover:shadow-lg transition-shadow' : ''}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500">Devoluciones</p>
                    <p className="text-2xl font-bold text-slate-900">{report.returns}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                {compareMode && previousYearReport && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                    {(() => {
                      const growth = calculateGrowth(report.returns, previousYearReport.returns);
                      return (
                        <>
                          {growth.direction === 'up' && <ArrowUpRight className="h-4 w-4 text-emerald-600" />}
                          {growth.direction === 'down' && <ArrowDownRight className="h-4 w-4 text-red-600" />}
                          {growth.direction === 'neutral' && <Minus className="h-4 w-4 text-slate-400" />}
                          <span className={`text-sm font-semibold ${
                            growth.direction === 'up' ? 'text-emerald-600' :
                            growth.direction === 'down' ? 'text-red-600' : 'text-slate-500'
                          }`}>
                            {growth.direction === 'up' ? '+' : growth.direction === 'down' ? '-' : ''}{growth.percentage}%
                          </span>
                          <span className="text-xs text-slate-500">vs año anterior</span>
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* External Repairs */}
            <Card className={`border-slate-200 ${compareMode ? 'hover:shadow-lg transition-shadow' : ''}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500">Reparaciones</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(report.repairs_revenue)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Wrench className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
                {compareMode && previousYearReport && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                    {(() => {
                      const growth = calculateGrowth(report.repairs_revenue, previousYearReport.repairs_revenue);
                      return (
                        <>
                          {growth.direction === 'up' && <ArrowUpRight className="h-4 w-4 text-emerald-600" />}
                          {growth.direction === 'down' && <ArrowDownRight className="h-4 w-4 text-red-600" />}
                          {growth.direction === 'neutral' && <Minus className="h-4 w-4 text-slate-400" />}
                          <span className={`text-sm font-semibold ${
                            growth.direction === 'up' ? 'text-emerald-600' :
                            growth.direction === 'down' ? 'text-red-600' : 'text-slate-500'
                          }`}>
                            {growth.direction === 'up' ? '+' : growth.direction === 'down' ? '-' : ''}{growth.percentage}%
                          </span>
                          <span className="text-xs text-slate-500">vs año anterior</span>
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Comparison Chart */}
          {compareMode && previousYearReport && (
            <Card className="border-slate-200 mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Comparativa Interanual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        name: 'Ingresos',
                        [format(dateRange.from, 'yyyy', { locale: es })]: report.total_revenue,
                        [format(subYears(dateRange.from, 1), 'yyyy', { locale: es })]: previousYearReport.total_revenue
                      },
                      {
                        name: 'Alquileres',
                        [format(dateRange.from, 'yyyy', { locale: es })]: report.new_rentals,
                        [format(subYears(dateRange.from, 1), 'yyyy', { locale: es })]: previousYearReport.new_rentals
                      },
                      {
                        name: 'Devoluciones',
                        [format(dateRange.from, 'yyyy', { locale: es })]: report.returns,
                        [format(subYears(dateRange.from, 1), 'yyyy', { locale: es })]: previousYearReport.returns
                      },
                      {
                        name: 'Reparaciones (€)',
                        [format(dateRange.from, 'yyyy', { locale: es })]: report.repairs_revenue,
                        [format(subYears(dateRange.from, 1), 'yyyy', { locale: es })]: previousYearReport.repairs_revenue
                      }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey={format(subYears(dateRange.from, 1), 'yyyy', { locale: es })} 
                      fill="#94a3b8" 
                      name={`Año ${format(subYears(dateRange.from, 1), 'yyyy', { locale: es })}`}
                    />
                    <Bar 
                      dataKey={format(dateRange.from, 'yyyy', { locale: es })} 
                      fill="#3b82f6" 
                      name={`Año ${format(dateRange.from, 'yyyy', { locale: es })}`}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Revenue by Payment Method */}
          <Card className="border-slate-200 mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-slate-500" />
                Desglose por Método de Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50 text-center">
                  <Banknote className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                  <p className="text-2xl font-bold text-emerald-700">{formatCurrency(report.cash_revenue)}</p>
                  <p className="text-sm text-slate-600">Efectivo</p>
                  {compareMode && previousYearReport && (
                    <p className={`text-xs mt-1 font-semibold ${
                      report.cash_revenue > previousYearReport.cash_revenue ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {calculateGrowth(report.cash_revenue, previousYearReport.cash_revenue).direction === 'up' ? '+' : '-'}
                      {calculateGrowth(report.cash_revenue, previousYearReport.cash_revenue).percentage}%
                    </p>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-blue-50 text-center">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(report.card_revenue)}</p>
                  <p className="text-sm text-slate-600">Tarjeta</p>
                  {compareMode && previousYearReport && (
                    <p className={`text-xs mt-1 font-semibold ${
                      report.card_revenue > previousYearReport.card_revenue ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {calculateGrowth(report.card_revenue, previousYearReport.card_revenue).direction === 'up' ? '+' : '-'}
                      {calculateGrowth(report.card_revenue, previousYearReport.card_revenue).percentage}%
                    </p>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-purple-50 text-center">
                  <Globe className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-2xl font-bold text-purple-700">{formatCurrency(report.online_revenue)}</p>
                  <p className="text-sm text-slate-600">Online</p>
                  {compareMode && previousYearReport && (
                    <p className={`text-xs mt-1 font-semibold ${
                      report.online_revenue > previousYearReport.online_revenue ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {calculateGrowth(report.online_revenue, previousYearReport.online_revenue).direction === 'up' ? '+' : '-'}
                      {calculateGrowth(report.online_revenue, previousYearReport.online_revenue).percentage}%
                    </p>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-slate-100 text-center">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-slate-500" />
                  <p className="text-2xl font-bold text-slate-700">{formatCurrency(report.other_revenue)}</p>
                  <p className="text-sm text-slate-600">Otros</p>
                  {compareMode && previousYearReport && (
                    <p className={`text-xs mt-1 font-semibold ${
                      report.other_revenue > previousYearReport.other_revenue ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {calculateGrowth(report.other_revenue, previousYearReport.other_revenue).direction === 'up' ? '+' : '-'}
                      {calculateGrowth(report.other_revenue, previousYearReport.other_revenue).percentage}%
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Returns */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Devoluciones Pendientes ({report.pending_returns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.pending_returns.length === 0 ? (
                <p className="text-center py-8 text-slate-500">
                  No hay devoluciones pendientes
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>DNI</TableHead>
                      <TableHead>Fecha Fin</TableHead>
                      <TableHead>Artículos</TableHead>
                      <TableHead>Pendiente</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.pending_returns.map((rental) => {
                      const isOverdue = new Date(rental.end_date) < new Date(date);
                      return (
                        <TableRow key={rental.rental_id} className={isOverdue ? 'bg-red-50' : ''}>
                          <TableCell className="font-medium">{rental.customer_name}</TableCell>
                          <TableCell className="font-mono">{rental.customer_dni}</TableCell>
                          <TableCell>{rental.end_date}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{rental.pending_items}</Badge>
                          </TableCell>
                          <TableCell className={rental.pending_amount > 0 ? 'text-red-600 font-semibold' : ''}>
                            €{rental.pending_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {isOverdue ? (
                              <Badge variant="destructive">Vencido</Badge>
                            ) : (
                              <Badge variant="outline">Activo</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
