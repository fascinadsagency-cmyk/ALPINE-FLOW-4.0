import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import OfflineIndicator from "@/components/OfflineIndicator";
import TrialBanner from "@/components/TrialBanner";
import PaywallOverlay from "@/components/PaywallOverlay";
import {
  LayoutDashboard,
  ShoppingCart,
  RotateCcw,
  Users,
  Package,
  DollarSign,
  BarChart3,
  Wrench,
  LogOut,
  Mountain,
  Menu,
  X,
  Wallet,
  Settings,
  Building2,
  Cog,
  HelpCircle,
  Headphones,
  UserCircle
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Layout() {
  const { user, logout, returnToSuperAdmin, isImpersonating } = useAuth();
  const { darkMode, t } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: "/nuevo-alquiler", icon: ShoppingCart, label: t('nav.newRental') },
    { to: "/alquileres-activos", icon: ShoppingCart, label: t('nav.activeRentals') },
    { to: "/devoluciones", icon: RotateCcw, label: t('nav.returns') },
    { to: "/clientes", icon: Users, label: t('nav.customers') },
    { to: "/proveedores", icon: Building2, label: t('nav.providers') },
    { to: "/inventario", icon: Package, label: t('nav.inventory') },
    { to: "/tarifas", icon: DollarSign, label: t('nav.tariffs'), adminOnly: true },
    { to: "/caja", icon: Wallet, label: t('nav.cashRegister') },
    { to: "/mantenimiento", icon: Wrench, label: t('nav.maintenance') },
    { to: "/reportes", icon: BarChart3, label: t('nav.reports'), adminOnly: true },
    { to: "/configuracion", icon: Cog, label: t('nav.settings'), adminOnly: true },
  ];

  // Add team management for ADMIN (not staff)
  if (user?.role === "admin" || user?.role === "super_admin") {
    navItems.push({ 
      to: "/equipo", 
      icon: Users, 
      labelKey: "nav.teamManagement",
      adminOnly: true 
    });
  }

  // Add store management for SUPER_ADMIN only - placed right after main items
  if (user?.role === "super_admin") {
    navItems.push({ to: "/tiendas", icon: Building2, labelKey: "nav.storeManagement", superAdmin: true });
    navItems.push({ to: "/planes", icon: DollarSign, label: "Planes", superAdmin: true });
  }

  // Filter nav items based on role
  const filteredNavItems = navItems.filter(item => {
    // STAFF cannot see admin-only sections
    if (item.adminOnly && user?.role === "staff") {
      return false;
    }
    // STAFF cannot see admin-only sections
    if (item.adminOnly && user?.role === "employee") {
      return false;
    }
    // Super admin sections
    if (item.superAdmin && user?.role !== "super_admin") {
      return false;
    }
    return true;
  });

  // Account items - for all authenticated users
  const accountItems = [
    { to: "/mi-cuenta", icon: UserCircle, labelKey: "nav.myAccount", isAccount: true }
  ];

  // Support items - always at the end
  const supportItems = [
    { to: "/ayuda", icon: HelpCircle, labelKey: "nav.help", isSupport: true },
    { to: "/soporte", icon: Headphones, labelKey: "nav.support", isSupport: true },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Sidebar - Desktop */}
      <aside className={`fixed left-0 top-0 z-40 hidden h-screen w-64 border-r transition-colors duration-300 lg:block ${
        darkMode 
          ? 'border-slate-700 bg-slate-800' 
          : 'border-slate-200 bg-gradient-to-b from-blue-600 to-purple-600 shadow-xl'
      }`}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={`flex h-20 items-center justify-center px-6 ${darkMode ? 'border-b border-slate-700' : 'border-b border-white/20'}`}>
            <img src="/logo-white.png" alt="SkiFlow Rental" className="h-8 w-auto object-contain" />
          </div>

          {/* Store Logo */}
          <div className={`flex items-center justify-center gap-2 px-6 py-3 ${darkMode ? 'border-b border-slate-700' : 'border-b border-white/20 bg-white/5'}`}>
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 overflow-hidden">
              {user?.store_logo ? (
                <img src={user.store_logo} alt="Logo Tienda" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-5 w-5 text-white/50" />
              )}
            </div>
            <span className={`text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-white/80'}`}>
              {user?.store_name || 'Mi Tienda'}
            </span>
          </div>

          {/* Navigation - tabindex=-1 to prevent Tab jumping to sidebar during form editing */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto" role="navigation" aria-label="Main navigation">
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                tabIndex={-1}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200",
                    isActive
                      ? darkMode 
                        ? "bg-primary/10 text-primary"
                        : "bg-white/25 text-white backdrop-blur-sm shadow-lg"
                      : darkMode 
                        ? "text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                  )
                }
              >
                <item.icon className="h-5 w-5" aria-hidden="true" tabIndex={-1} />
                {item.labelKey ? t(item.labelKey) : item.label}
              </NavLink>
            ))}

            {/* Account Section */}
            {accountItems.length > 0 && (
              <div className={`pt-4 mt-4 border-t ${darkMode ? 'border-slate-700' : 'border-white/20'}`}>
                {accountItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    tabIndex={-1}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200",
                        isActive
                          ? darkMode 
                            ? "bg-purple-600/10 text-purple-600"
                            : "bg-white/25 text-white backdrop-blur-sm shadow-lg"
                          : darkMode 
                            ? "text-slate-300 hover:bg-slate-700 hover:text-white"
                            : "text-white/75 hover:bg-white/10 hover:text-white"
                      )
                    }
                  >
                    <item.icon className="h-5 w-5" aria-hidden="true" tabIndex={-1} />
                    {item.labelKey ? t(item.labelKey) : item.label}
                  </NavLink>
                ))}
              </div>
            )}

            {/* Support Section */}
            <div className={`pt-4 mt-4 border-t ${darkMode ? 'border-slate-700' : 'border-white/20'}`}>
              {supportItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  tabIndex={-1}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200",
                      isActive
                        ? darkMode 
                          ? "bg-blue-600/10 text-blue-600"
                          : "bg-white/25 text-white backdrop-blur-sm shadow-lg"
                        : darkMode 
                          ? "text-slate-300 hover:bg-slate-700 hover:text-white"
                          : "text-white/75 hover:bg-white/10 hover:text-white"
                    )
                  }
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" tabIndex={-1} />
                  {item.labelKey ? t(item.labelKey) : item.label}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* User */}
          <div className={`border-t p-4 ${darkMode ? 'border-slate-700' : 'border-white/20'}`}>
            <div className="flex items-center gap-3">
              {/* Avatar clickeable */}
              <button 
                onClick={() => navigate("/mi-cuenta")}
                className="flex-shrink-0 group"
              >
                <div className="relative">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center ring-2 ring-white/20 group-hover:ring-white/40 transition-all">
                    {user?.photo_url ? (
                      <img src={user.photo_url} alt={user?.username} className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle className="h-6 w-6 text-white/70" />
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
              </button>
              
              <div className="flex-1 min-w-0">
                <button 
                  onClick={() => navigate("/mi-cuenta")}
                  className="text-left w-full group"
                >
                  <p className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-white'} group-hover:text-white/80 transition-colors`}>
                    {user?.username}
                  </p>
                  <p className={`text-xs capitalize truncate ${darkMode ? 'text-slate-400' : 'text-white/60'}`}>
                    {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : user?.role === 'staff' ? 'Staff' : user?.role}
                  </p>
                </button>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className={darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-white/75 hover:text-white hover:bg-white/10'}
                data-testid="logout-btn"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className={`fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b px-4 lg:hidden transition-colors duration-300 ${
        darkMode 
          ? 'border-slate-700 bg-slate-800' 
          : 'border-slate-200 bg-white'
      }`}>
        <div className="flex items-center">
          <img src="/logo.png" alt="SkiFlow Rental" className="h-7 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-2">
          <OfflineIndicator />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={darkMode ? 'text-slate-300' : ''}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className={`fixed inset-0 z-40 pt-14 lg:hidden transition-colors duration-300 ${
          darkMode ? 'bg-slate-800' : 'bg-white'
        }`}>
          <nav className="space-y-1 p-4 max-h-[calc(100vh-8rem)] overflow-y-auto" role="navigation" aria-label="Mobile navigation">
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMobileMenuOpen(false)}
                tabIndex={-1}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : darkMode
                        ? "text-slate-300 hover:bg-slate-700"
                        : "text-slate-600 hover:bg-slate-100"
                  )
                }
              >
                <item.icon className="h-5 w-5" aria-hidden="true" tabIndex={-1} />
                {item.labelKey ? t(item.labelKey) : item.label}
              </NavLink>
            ))}

            {/* Account Section Mobile */}
            {accountItems.length > 0 && (
              <div className={`pt-4 mt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                {accountItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    tabIndex={-1}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors",
                        isActive
                          ? "bg-purple-600/10 text-purple-600"
                          : darkMode
                            ? "text-slate-300 hover:bg-slate-700"
                            : "text-slate-600 hover:bg-slate-100"
                      )
                    }
                  >
                    <item.icon className="h-5 w-5" aria-hidden="true" tabIndex={-1} />
                    {item.labelKey ? t(item.labelKey) : item.label}
                  </NavLink>
                ))}
              </div>
            )}

            {/* Support Section Mobile */}
            <div className={`pt-4 mt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              {supportItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  tabIndex={-1}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors",
                      isActive
                        ? "bg-blue-600/10 text-blue-600"
                        : darkMode
                          ? "text-slate-300 hover:bg-slate-700"
                          : "text-slate-600 hover:bg-slate-100"
                    )
                  }
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" tabIndex={-1} />
                  {item.labelKey ? t(item.labelKey) : item.label}
                </NavLink>
              ))}
            </div>
          </nav>
          <div className={`border-t p-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <Button
              variant="outline"
              className={`w-full justify-start gap-2 ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:pl-64">
        {/* Impersonation Banner */}
        {isImpersonating && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium" data-testid="impersonation-banner">
            <span>Estás viendo la tienda: <strong>{user?.store_name || 'Tienda'}</strong></span>
            <button 
              onClick={returnToSuperAdmin}
              className="bg-white text-amber-700 px-3 py-1 rounded-md text-xs font-bold hover:bg-amber-50 transition-colors"
              data-testid="return-super-admin-btn"
            >
              Volver a Super Admin
            </button>
          </div>
        )}
        {/* Desktop Top Bar with Offline Indicator */}
        <div className={`hidden lg:flex h-16 items-center justify-end px-6 border-b transition-colors duration-300 ${
          darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white shadow-sm'
        }`}>
          <div className="flex items-center gap-4">
            <OfflineIndicator />
            <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {user?.username}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className={`gap-2 font-medium ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
        {/* Trial Banner */}
        <TrialBanner />
        
        <PaywallOverlay>
          <div className={`min-h-screen pt-14 lg:pt-0 transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <Outlet />
          </div>
        </PaywallOverlay>
      </main>
    </div>
  );
}
