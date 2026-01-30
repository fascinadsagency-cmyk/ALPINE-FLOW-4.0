"""
Iteration 13 - Testing revenue logic and cash flow fixes
Tests:
1. Dashboard 'Ingresos Netos Hoy' uses same source as Caja (cash_movements)
2. 'Ingresos Netos Hoy' = Total Income - Total Refunds
3. /api/reports/stats returns revenue_today calculated from cash_movements
4. /api/cash/summary/realtime returns by_category with rental, rental_adjustment, other
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRevenueLogicAndCashFlow:
    """Test revenue calculation and cash flow integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        self.token = None
        # Login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "demo",
            "password": "demo1234"
        })
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
    
    def test_auth_login(self):
        """Test authentication works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "demo",
            "password": "demo1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Auth login successful - user: {data['user']['username']}")
    
    def test_reports_stats_endpoint_returns_200(self):
        """Test /api/reports/stats returns 200"""
        response = requests.get(f"{BASE_URL}/api/reports/stats", headers=self.headers)
        assert response.status_code == 200, f"Stats endpoint failed: {response.text}"
        print("✓ /api/reports/stats returns 200")
    
    def test_reports_stats_has_revenue_today(self):
        """Test /api/reports/stats returns revenue_today field"""
        response = requests.get(f"{BASE_URL}/api/reports/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "revenue_today" in data, "revenue_today field missing from stats"
        print(f"✓ revenue_today present in stats: €{data['revenue_today']}")
    
    def test_reports_stats_revenue_is_numeric(self):
        """Test revenue_today is a numeric value"""
        response = requests.get(f"{BASE_URL}/api/reports/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        revenue = data.get("revenue_today")
        assert isinstance(revenue, (int, float)), f"revenue_today should be numeric, got {type(revenue)}"
        print(f"✓ revenue_today is numeric: {revenue}")
    
    def test_cash_summary_realtime_endpoint_returns_200(self):
        """Test /api/cash/summary/realtime returns 200"""
        response = requests.get(f"{BASE_URL}/api/cash/summary/realtime", headers=self.headers)
        assert response.status_code == 200, f"Cash summary endpoint failed: {response.text}"
        print("✓ /api/cash/summary/realtime returns 200")
    
    def test_cash_summary_has_by_category(self):
        """Test /api/cash/summary/realtime returns by_category field"""
        response = requests.get(f"{BASE_URL}/api/cash/summary/realtime", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "by_category" in data, "by_category field missing from cash summary"
        print(f"✓ by_category present in cash summary: {data['by_category']}")
    
    def test_cash_summary_by_category_has_required_keys(self):
        """Test by_category has rental, rental_adjustment, other keys"""
        response = requests.get(f"{BASE_URL}/api/cash/summary/realtime", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        by_category = data.get("by_category", {})
        
        required_keys = ["rental", "rental_adjustment", "other"]
        for key in required_keys:
            assert key in by_category, f"by_category missing key: {key}"
        
        print(f"✓ by_category has all required keys: {list(by_category.keys())}")
    
    def test_cash_summary_has_total_income_and_refunds(self):
        """Test cash summary has total_income and total_refunds for calculation"""
        response = requests.get(f"{BASE_URL}/api/cash/summary/realtime", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total_income" in data, "total_income missing"
        assert "total_refunds" in data, "total_refunds missing"
        assert "balance" in data, "balance missing"
        
        print(f"✓ Cash summary has: total_income={data['total_income']}, total_refunds={data['total_refunds']}, balance={data['balance']}")
    
    def test_revenue_calculation_formula(self):
        """Test that revenue_today = total_income - total_refunds (when session active)"""
        # Get stats
        stats_response = requests.get(f"{BASE_URL}/api/reports/stats", headers=self.headers)
        assert stats_response.status_code == 200
        stats = stats_response.json()
        
        # Get cash summary
        cash_response = requests.get(f"{BASE_URL}/api/cash/summary/realtime", headers=self.headers)
        assert cash_response.status_code == 200
        cash = cash_response.json()
        
        if cash.get("session_active"):
            # When session is active, revenue_today should equal total_income - total_refunds
            expected_revenue = cash["total_income"] - cash["total_refunds"]
            actual_revenue = stats["revenue_today"]
            
            # Allow small floating point differences
            assert abs(expected_revenue - actual_revenue) < 0.01, \
                f"Revenue mismatch: expected {expected_revenue}, got {actual_revenue}"
            
            print(f"✓ Revenue formula verified: {cash['total_income']} - {cash['total_refunds']} = {actual_revenue}")
        else:
            print(f"⚠ No active session - revenue_today fallback: {stats['revenue_today']}")
    
    def test_cash_summary_has_by_payment_method(self):
        """Test cash summary has by_payment_method breakdown"""
        response = requests.get(f"{BASE_URL}/api/cash/summary/realtime", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "by_payment_method" in data, "by_payment_method missing"
        by_method = data["by_payment_method"]
        
        # Should have cash and card
        assert "cash" in by_method or "card" in by_method, "Neither cash nor card in by_payment_method"
        
        print(f"✓ by_payment_method present: {list(by_method.keys())}")
    
    def test_dashboard_endpoint_returns_200(self):
        """Test /api/dashboard returns 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=self.headers)
        assert response.status_code == 200, f"Dashboard endpoint failed: {response.text}"
        print("✓ /api/dashboard returns 200")
    
    def test_dashboard_has_stats_with_revenue(self):
        """Test dashboard response includes stats with revenue_today"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "stats" in data, "stats missing from dashboard"
        stats = data["stats"]
        assert "revenue_today" in stats, "revenue_today missing from dashboard stats"
        
        print(f"✓ Dashboard stats has revenue_today: €{stats['revenue_today']}")
    
    def test_customer_history_endpoint(self):
        """Test customer history endpoint exists and works"""
        # First get a customer
        customers_response = requests.get(f"{BASE_URL}/api/customers", headers=self.headers)
        assert customers_response.status_code == 200
        customers = customers_response.json()
        
        if customers:
            customer_id = customers[0]["id"]
            history_response = requests.get(f"{BASE_URL}/api/customers/{customer_id}/history", headers=self.headers)
            assert history_response.status_code == 200, f"Customer history failed: {history_response.text}"
            
            history = history_response.json()
            assert "rentals" in history, "rentals missing from customer history"
            assert "total_rentals" in history, "total_rentals missing from customer history"
            
            print(f"✓ Customer history endpoint works - {history['total_rentals']} rentals found")
        else:
            print("⚠ No customers found to test history")
    
    def test_rentals_endpoint_with_customer_filter(self):
        """Test rentals can be filtered by customer_id"""
        # Get a customer first
        customers_response = requests.get(f"{BASE_URL}/api/customers", headers=self.headers)
        assert customers_response.status_code == 200
        customers = customers_response.json()
        
        if customers:
            customer_id = customers[0]["id"]
            rentals_response = requests.get(f"{BASE_URL}/api/rentals?customer_id={customer_id}", headers=self.headers)
            assert rentals_response.status_code == 200, f"Rentals filter failed: {rentals_response.text}"
            print(f"✓ Rentals endpoint with customer_id filter works")
        else:
            print("⚠ No customers found to test rentals filter")


class TestCashSessionAndMovements:
    """Test cash session and movements for revenue tracking"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        self.token = None
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "demo",
            "password": "demo1234"
        })
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
    
    def test_cash_session_info_in_summary(self):
        """Test cash summary includes session info"""
        response = requests.get(f"{BASE_URL}/api/cash/summary/realtime", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "session_active" in data, "session_active missing"
        assert "opening_balance" in data, "opening_balance missing"
        
        if data["session_active"]:
            assert "session_id" in data, "session_id missing when session active"
            print(f"✓ Active session found: {data['session_id'][:8]}...")
        else:
            print("⚠ No active cash session")
    
    def test_cash_movements_endpoint(self):
        """Test /api/cash/movements endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/cash/movements", headers=self.headers)
        # Should return 200 or list of movements
        assert response.status_code == 200, f"Cash movements endpoint failed: {response.text}"
        print("✓ /api/cash/movements endpoint works")
    
    def test_by_category_values_are_numeric(self):
        """Test by_category values are all numeric"""
        response = requests.get(f"{BASE_URL}/api/cash/summary/realtime", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        by_category = data.get("by_category", {})
        for key, value in by_category.items():
            assert isinstance(value, (int, float)), f"by_category[{key}] should be numeric, got {type(value)}"
        
        print(f"✓ All by_category values are numeric: {by_category}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
