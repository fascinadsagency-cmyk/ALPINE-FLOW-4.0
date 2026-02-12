import { Outlet, NavLink, useLocation } from "react-router-dom";
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
  const { user, logout } = useAuth();
  const { darkMode, t } = useSettings();
  const location = useLocation();
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
    { to: "/integraciones", icon: Settings, label: t('nav.integrations'), adminOnly: true },
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

  // Add store management for SUPER_ADMIN only
  if (user?.role === "super_admin") {
    navItems.push({ to: "/tiendas", icon: Building2, labelKey: "nav.storeManagement", superAdmin: true });
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
          : 'border-slate-200 bg-white'
      }`}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={`flex h-16 items-center gap-3 border-b px-6 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <Mountain className="h-5 w-5" />
            </div>
            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Plus Jakarta Sans' }}>
              AlpineFlow
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
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : darkMode 
                        ? "text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )
                }
              >
                <item.icon className="h-5 w-5" aria-hidden="true" tabIndex={-1} />
                {item.labelKey ? t(item.labelKey) : item.label}
              </NavLink>
            ))}

            {/* Account Section */}
            {accountItems.length > 0 && (
              <div className={`pt-4 mt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                {accountItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    tabIndex={-1}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-purple-600/10 text-purple-600"
                          : darkMode 
                            ? "text-slate-300 hover:bg-slate-700 hover:text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
            <div className={`pt-4 mt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              {supportItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  tabIndex={-1}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-600/10 text-blue-600"
                        : darkMode 
                          ? "text-slate-300 hover:bg-slate-700 hover:text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
          <div className={`border-t p-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{user?.username}</p>
                <p className={`text-xs capitalize ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{user?.role}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className={darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900'}
                data-testid="logout-btn"
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
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Mountain className="h-4 w-4" />
          </div>
          <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>AlpineFlow</span>
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
        {/* Desktop Top Bar with Offline Indicator */}
        <div className={`hidden lg:flex h-14 items-center justify-end px-6 border-b transition-colors duration-300 ${
          darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
        }`}>
          <div className="flex items-center gap-4">
            <OfflineIndicator />
            <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {user?.username}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className={`gap-2 ${darkMode ? 'text-slate-400 hover:text-slate-200' : ''}`}
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
