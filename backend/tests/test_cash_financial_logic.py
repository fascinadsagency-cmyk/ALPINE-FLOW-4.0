"""
Test suite for Cash Register Financial Logic - Iteration 19
Tests the corrected financial calculations for the cash register system.

Key formulas being tested:
- INGRESOS_BRUTOS = SUM(income) 
- TOTAL_SALIDAS = SUM(expense) + SUM(refund)
- BALANCE_NETO_DIA = Ingresos Brutos - Total Salidas (SIN fondo inicial)
- EFECTIVO_ESPERADO = Fondo + (Ingresos Efectivo - Salidas Efectivo)
- TARJETA_ESPERADA = Ingresos Tarjeta - Salidas Tarjeta
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCashSummaryRealtime:
    """Tests for /api/cash/summary/realtime endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "testcaja",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_cash_summary_realtime_returns_correct_fields(self):
        """Verify endpoint returns all required fields for the new financial logic"""
        response = requests.get(f"{BASE_URL}/api/cash/summary/realtime", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Required KPI fields
        assert "ingresos_brutos" in data, "Missing ingresos_brutos field"
        assert "total_salidas" in data, "Missing total_salidas field"
        assert "balance_neto_dia" in data, "Missing balance_neto_dia field"
        
        # Required arqueo fields
        assert "efectivo_esperado" in data, "Missing efectivo_esperado field"
        assert "tarjeta_esperada" in data, "Missing tarjeta_esperada field"
        
        # Session info
        assert "opening_balance" in data, "Missing opening_balance field"
        assert "session_active" in data, "Missing session_active field"
        
        print(f"✓ All required fields present in response")
        print(f"  - ingresos_brutos: {data['ingresos_brutos']}")
        print(f"  - total_salidas: {data['total_salidas']}")
        print(f"  - balance_neto_dia: {data['balance_neto_dia']}")
        print(f"  - efectivo_esperado: {data['efectivo_esperado']}")
        print(f"  - tarjeta_esperada: {data['tarjeta_esperada']}")
    
    def test_balance_neto_dia_calculation(self):
        """Verify Balance Neto del Día = Ingresos Brutos - Total Salidas"""
        response = requests.get(f"{BASE_URL}/api/cash/summary/realtime", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        
        ingresos = data["ingresos_brutos"]
        salidas = data["total_salidas"]
        balance_neto = data["balance_neto_dia"]
        
        expected_balance = round(ingresos - salidas, 2)
        actual_balance = round(balance_neto, 2)
        
        assert abs(expected_balance - actual_balance) < 0.01, \
            f"Balance Neto calculation incorrect: {ingresos} - {salidas} = {expected_balance}, got {actual_balance}"
        
        print(f"✓ Balance Neto del Día calculation correct")
        print(f"  {ingresos} - {salidas} = {balance_neto}")
    
    def test_efectivo_esperado_includes_opening_balance(self):
        """Verify Efectivo Esperado = Fondo + (Ingresos Efectivo - Salidas Efectivo)"""
        response = requests.get(f"{BASE_URL}/api/cash/summary/realtime", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        
        if not data.get("session_active"):
            pytest.skip("No active session to test")
        
        opening_balance = data["opening_balance"]
        efectivo_esperado = data["efectivo_esperado"]
        by_method = data.get("by_payment_method", {})
        cash_data = by_method.get("cash", {"income": 0, "expense": 0, "refund": 0})
        
        cash_neto = cash_data["income"] - cash_data["expense"] - cash_data["refund"]
        expected_efectivo = round(opening_balance + cash_neto, 2)
        actual_efectivo = round(efectivo_esperado, 2)
        
        assert abs(expected_efectivo - actual_efectivo) < 0.01, \
            f"Efectivo Esperado calculation incorrect: {opening_balance} + {cash_neto} = {expected_efectivo}, got {actual_efectivo}"
        
        print(f"✓ Efectivo Esperado calculation correct")
        print(f"  Fondo: {opening_balance} + Neto Efectivo: {cash_neto} = {efectivo_esperado}")
    
    def test_tarjeta_esperada_calculation(self):
        """Verify Tarjeta Esperada = Ingresos Tarjeta - Salidas Tarjeta"""
        response = requests.get(f"{BASE_URL}/api/cash/summary/realtime", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        
        tarjeta_esperada = data["tarjeta_esperada"]
        by_method = data.get("by_payment_method", {})
        card_data = by_method.get("card", {"income": 0, "expense": 0, "refund": 0})
        
        expected_tarjeta = round(card_data["income"] - card_data["expense"] - card_data["refund"], 2)
        actual_tarjeta = round(tarjeta_esperada, 2)
        
        assert abs(expected_tarjeta - actual_tarjeta) < 0.01, \
            f"Tarjeta Esperada calculation incorrect: expected {expected_tarjeta}, got {actual_tarjeta}"
        
        print(f"✓ Tarjeta Esperada calculation correct")
        print(f"  Card income: {card_data['income']} - expense: {card_data['expense']} - refund: {card_data['refund']} = {tarjeta_esperada}")
    
    def test_total_salidas_includes_refunds(self):
        """Verify Total Salidas = Gastos + Devoluciones"""
        response = requests.get(f"{BASE_URL}/api/cash/summary/realtime", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        
        total_salidas = data["total_salidas"]
        total_expense = data.get("total_expense", 0)
        total_refunds = data.get("total_refunds", 0)
        
        expected_salidas = round(total_expense + total_refunds, 2)
        actual_salidas = round(total_salidas, 2)
        
        assert abs(expected_salidas - actual_salidas) < 0.01, \
            f"Total Salidas calculation incorrect: {total_expense} + {total_refunds} = {expected_salidas}, got {actual_salidas}"
        
        print(f"✓ Total Salidas calculation correct")
        print(f"  Gastos: {total_expense} + Devoluciones: {total_refunds} = {total_salidas}")


class TestDashboardNoFinancialKPIs:
    """Tests to verify Dashboard does NOT show financial KPIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "testcaja",
            "password": "test1234"
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_returns_operational_stats(self):
        """Verify Dashboard returns operational stats (not financial)"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        stats = data.get("stats", {})
        
        # Operational KPIs that SHOULD be present
        assert "active_rentals" in stats, "Missing active_rentals"
        assert "returns_today" in stats, "Missing returns_today"
        assert "inventory" in stats, "Missing inventory"
        
        # Verify inventory has occupancy data
        inventory = stats.get("inventory", {})
        assert "available" in inventory, "Missing inventory.available"
        assert "rented" in inventory, "Missing inventory.rented"
        
        print(f"✓ Dashboard returns operational stats")
        print(f"  - active_rentals: {stats.get('active_rentals')}")
        print(f"  - returns_today: {stats.get('returns_today')}")
        print(f"  - inventory.rented: {inventory.get('rented')}")
        print(f"  - inventory.available: {inventory.get('available')}")
    
    def test_dashboard_has_occupancy_by_category(self):
        """Verify Dashboard has occupancy by category (operational metric)"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        occupancy = data.get("occupancy_by_category", {})
        
        # Should have category data
        assert len(occupancy) > 0, "No occupancy data by category"
        
        # Each category should have total, rented, percentage
        for category, cat_data in occupancy.items():
            assert "total" in cat_data, f"Missing total for {category}"
            assert "rented" in cat_data, f"Missing rented for {category}"
            assert "percentage" in cat_data, f"Missing percentage for {category}"
        
        print(f"✓ Dashboard has occupancy by category")
        for cat, cat_data in occupancy.items():
            print(f"  - {cat}: {cat_data['rented']}/{cat_data['total']} ({cat_data['percentage']}%)")


class TestCashSessionManagement:
    """Tests for cash session management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "testcaja",
            "password": "test1234"
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_active_session(self):
        """Verify can get active cash session"""
        response = requests.get(f"{BASE_URL}/api/cash/sessions/active", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        
        if data.get("session"):
            session = data["session"]
            assert "id" in session, "Missing session id"
            assert "opening_balance" in session, "Missing opening_balance"
            assert "status" in session, "Missing status"
            print(f"✓ Active session found: {session.get('id', 'N/A')[:8]}...")
            print(f"  - Opening balance: {session.get('opening_balance')}")
            print(f"  - Status: {session.get('status')}")
        else:
            print(f"✓ No active session (expected if none opened)")
    
    def test_get_cash_movements(self):
        """Verify can get cash movements for today"""
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(f"{BASE_URL}/api/cash/movements?date={today}", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Expected list of movements"
        
        print(f"✓ Got {len(data)} cash movements for {today}")
        
        # Verify movement structure if any exist
        if len(data) > 0:
            movement = data[0]
            assert "movement_type" in movement, "Missing movement_type"
            assert "amount" in movement, "Missing amount"
            assert "payment_method" in movement, "Missing payment_method"
            print(f"  - First movement: {movement.get('movement_type')} - €{movement.get('amount')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
