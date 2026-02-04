#!/usr/bin/env python3
"""
Comprehensive Backend Test for Cash Session System and Rental Payment Integration
Testing complete flow from cash session opening to rental creation with automatic cash registration.
Based on review request: 🎯 TESTING COMPLETO - Sistema de Sesiones de Caja y Pago de Alquileres
"""

import requests
import json
from datetime import datetime, timedelta
import sys

# Configuration
BACKEND_URL = "https://skiflow-1.preview.emergentagent.com/api"
TEST_DATE = "2026-01-29"

class CashSessionTester:
    def __init__(self):
        self.token = None
        self.headers = {}
        self.test_results = []
        self.session_id = None
        self.customer_id = None
        self.item_barcode = None
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status} {test_name}: {details}")
        print(f"{status} {test_name}: {details}")
        
    def authenticate(self):
        """Authenticate with test user"""
        try:
            # Try to login with existing admin2 user
            login_data = {
                "username": "admin2",
                "password": "admin123"
            }
            
            response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 401:
                # User doesn't exist, create it
                register_data = {
                    "username": "admin2",
                    "password": "admin123",
                    "role": "admin"
                }
                response = requests.post(f"{BACKEND_URL}/auth/register", json=register_data)
                
            if response.status_code in [200, 201]:
                data = response.json()
                self.token = data["access_token"]
                self.headers = {"Authorization": f"Bearer {self.token}"}
                self.log_test("Authentication", True, f"Logged in as {login_data['username']}")
                return True
            else:
                self.log_test("Authentication", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Authentication", False, f"Exception: {str(e)}")
            return False

    # FASE 1: SESIONES DE CAJA
    def test_initial_session_state(self):
        """Test GET /api/cash/sessions/active - should return null initially"""
        try:
            response = requests.get(f"{BACKEND_URL}/cash/sessions/active", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Initial Session State", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            # Should return null or empty object if no active session
            if data is None or (isinstance(data, dict) and not data):
                self.log_test("Initial Session State", True, "No active session found (expected)")
                return True
            else:
                # If there's an active session, we need to close it first
                self.log_test("Initial Session State", True, f"Found existing active session: {data.get('id', 'unknown')}")
                return True
                
        except Exception as e:
            self.log_test("Initial Session State", False, f"Exception: {str(e)}")
            return False

    def test_open_new_session(self):
        """Test POST /api/cash/sessions/open"""
        try:
            session_data = {
                "opening_balance": 100.0,
                "notes": "Test session for comprehensive testing"
            }
            
            response = requests.post(f"{BACKEND_URL}/cash/sessions/open", json=session_data, headers=self.headers)
            
            if response.status_code in [200, 201]:
                data = response.json()
                
                # Verify required fields
                required_fields = ["id", "session_number", "opened_by", "status"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Open New Session", False, f"Missing fields: {missing_fields}")
                    return False
                
                if data.get("status") != "open":
                    self.log_test("Open New Session", False, f"Expected status 'open', got '{data.get('status')}'")
                    return False
                
                self.session_id = data["id"]
                self.log_test("Open New Session", True, 
                             f"Session opened: ID={data['id']}, Number={data['session_number']}, Balance=€{data.get('opening_balance', 0)}")
                return True
            else:
                self.log_test("Open New Session", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Open New Session", False, f"Exception: {str(e)}")
            return False

    def test_verify_active_session(self):
        """Test GET /api/cash/sessions/active - should return the created session"""
        try:
            response = requests.get(f"{BACKEND_URL}/cash/sessions/active", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Verify Active Session", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            if not data:
                self.log_test("Verify Active Session", False, "No active session found")
                return False
            
            # Verify it's our session
            if data.get("id") != self.session_id:
                self.log_test("Verify Active Session", False, f"Session ID mismatch. Expected: {self.session_id}, Got: {data.get('id')}")
                return False
            
            # Verify fields
            expected_fields = ["id", "session_number", "opening_balance"]
            for field in expected_fields:
                if field not in data:
                    self.log_test("Verify Active Session", False, f"Missing field: {field}")
                    return False
            
            self.log_test("Verify Active Session", True, 
                         f"Active session verified: Number={data['session_number']}, Balance=€{data['opening_balance']}")
            return True
                
        except Exception as e:
            self.log_test("Verify Active Session", False, f"Exception: {str(e)}")
            return False

    def test_prevent_second_session(self):
        """Test POST /api/cash/sessions/open - should fail when session already open"""
        try:
            session_data = {
                "opening_balance": 50.0,
                "notes": "This should fail"
            }
            
            response = requests.post(f"{BACKEND_URL}/cash/sessions/open", json=session_data, headers=self.headers)
            
            if response.status_code == 400:
                error_text = response.text.lower()
                if "already" in error_text and "open" in error_text:
                    self.log_test("Prevent Second Session", True, "Correctly prevented opening second session")
                    return True
                else:
                    self.log_test("Prevent Second Session", False, f"Wrong error message: {response.text}")
                    return False
            else:
                self.log_test("Prevent Second Session", False, f"Expected 400 error, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Prevent Second Session", False, f"Exception: {str(e)}")
            return False

    # FASE 2: RESUMEN DE CAJA VINCULADO A SESIÓN
    def test_summary_with_active_session(self):
        """Test GET /api/cash/summary with active session"""
        try:
            response = requests.get(f"{BACKEND_URL}/cash/summary?date={TEST_DATE}", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Summary with Active Session", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            # Verify session linkage
            required_fields = ["session_id", "session_active", "opening_balance", "total_income", "movements_count"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_test("Summary with Active Session", False, f"Missing fields: {missing_fields}")
                return False
            
            # Verify session data
            if data.get("session_id") != self.session_id:
                self.log_test("Summary with Active Session", False, f"Session ID mismatch. Expected: {self.session_id}, Got: {data.get('session_id')}")
                return False
            
            if not data.get("session_active"):
                self.log_test("Summary with Active Session", False, "session_active should be true")
                return False
            
            if data.get("opening_balance") != 100.0:
                self.log_test("Summary with Active Session", False, f"Opening balance mismatch. Expected: 100.0, Got: {data.get('opening_balance')}")
                return False
            
            self.log_test("Summary with Active Session", True, 
                         f"Session linked correctly: ID={data['session_id']}, Active={data['session_active']}, Balance=€{data['opening_balance']}")
            return True
                
        except Exception as e:
            self.log_test("Summary with Active Session", False, f"Exception: {str(e)}")
            return False

    # FASE 3: CREAR MOVIMIENTO VINCULADO A SESIÓN
    def test_create_movement_with_session(self):
        """Test POST /api/cash/movements - should link to active session"""
        try:
            movement_data = {
                "movement_type": "income",
                "amount": 50.0,
                "payment_method": "cash",
                "category": "rental",
                "concept": "Test movement with session"
            }
            
            response = requests.post(f"{BACKEND_URL}/cash/movements", json=movement_data, headers=self.headers)
            
            if response.status_code in [200, 201]:
                data = response.json()
                
                # Verify session linkage
                if "session_id" not in data:
                    self.log_test("Create Movement with Session", False, "Movement missing session_id")
                    return False
                
                if data.get("session_id") != self.session_id:
                    self.log_test("Create Movement with Session", False, f"Session ID mismatch. Expected: {self.session_id}, Got: {data.get('session_id')}")
                    return False
                
                self.log_test("Create Movement with Session", True, 
                             f"Movement created and linked to session: Amount=€{data['amount']}, Session={data['session_id']}")
                return True
            else:
                self.log_test("Create Movement with Session", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Movement with Session", False, f"Exception: {str(e)}")
            return False

    def test_verify_updated_summary(self):
        """Test GET /api/cash/summary - verify totals updated after movement"""
        try:
            response = requests.get(f"{BACKEND_URL}/cash/summary?date={TEST_DATE}", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Verify Updated Summary", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            # Verify updated totals
            expected_income = 50.0  # From our test movement
            expected_balance = 150.0  # 100 opening + 50 income
            expected_movements = 1  # At least 1 movement
            
            actual_income = data.get("total_income", 0)
            actual_balance = data.get("balance", 0)
            actual_movements = data.get("movements_count", 0)
            
            # Check if values are at least what we expect (there might be more from other tests)
            if actual_income < expected_income:
                self.log_test("Verify Updated Summary", False, f"Income too low. Expected: ≥{expected_income}, Got: {actual_income}")
                return False
            
            if actual_movements < expected_movements:
                self.log_test("Verify Updated Summary", False, f"Movement count too low. Expected: ≥{expected_movements}, Got: {actual_movements}")
                return False
            
            self.log_test("Verify Updated Summary", True, 
                         f"Summary updated correctly: Income=€{actual_income}, Balance=€{actual_balance}, Movements={actual_movements}")
            return True
                
        except Exception as e:
            self.log_test("Verify Updated Summary", False, f"Exception: {str(e)}")
            return False

    # FASE 4: CREAR ALQUILER (flujo completo con rental API)
    def test_get_test_customer(self):
        """Test GET /api/customers?search=757 - get customer for rental"""
        try:
            response = requests.get(f"{BACKEND_URL}/customers?search=757", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Get Test Customer", False, f"Status: {response.status_code}")
                return False
            
            customers = response.json()
            
            if not customers or len(customers) == 0:
                # Create a test customer
                customer_data = {
                    "dni": "75757575T",
                    "name": "Cliente Test Sesiones",
                    "phone": "600757757",
                    "address": "Calle Test 757",
                    "city": "Test City"
                }
                
                create_response = requests.post(f"{BACKEND_URL}/customers", json=customer_data, headers=self.headers)
                
                if create_response.status_code in [200, 201]:
                    customer = create_response.json()
                    self.customer_id = customer["id"]
                    self.log_test("Get Test Customer", True, f"Created test customer: {customer['name']} (ID: {customer['id']})")
                    return True
                else:
                    self.log_test("Get Test Customer", False, f"Could not create customer: {create_response.status_code}")
                    return False
            else:
                customer = customers[0]
                self.customer_id = customer["id"]
                self.log_test("Get Test Customer", True, f"Found customer: {customer['name']} (ID: {customer['id']})")
                return True
                
        except Exception as e:
            self.log_test("Get Test Customer", False, f"Exception: {str(e)}")
            return False

    def test_get_available_item(self):
        """Test GET /api/items?status=available - get item for rental"""
        try:
            response = requests.get(f"{BACKEND_URL}/items?status=available", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Get Available Item", False, f"Status: {response.status_code}")
                return False
            
            items = response.json()
            
            if not items or len(items) == 0:
                # Create a test item
                item_data = {
                    "barcode": "TEST-SESSION-001",
                    "internal_code": "SES-TEST-001",
                    "item_type": "ski",
                    "brand": "Test Brand",
                    "model": "Session Test",
                    "size": "170",
                    "purchase_price": 200.0,
                    "purchase_date": "2024-01-01",
                    "category": "MEDIA"
                }
                
                create_response = requests.post(f"{BACKEND_URL}/items", json=item_data, headers=self.headers)
                
                if create_response.status_code in [200, 201]:
                    item = create_response.json()
                    self.item_barcode = item["barcode"]
                    self.log_test("Get Available Item", True, f"Created test item: {item['brand']} {item['model']} (Barcode: {item['barcode']})")
                    return True
                else:
                    self.log_test("Get Available Item", False, f"Could not create item: {create_response.status_code}")
                    return False
            else:
                item = items[0]
                self.item_barcode = item["barcode"]
                self.log_test("Get Available Item", True, f"Found available item: {item['brand']} {item['model']} (Barcode: {item['barcode']})")
                return True
                
        except Exception as e:
            self.log_test("Get Available Item", False, f"Exception: {str(e)}")
            return False

    def test_create_rental_with_payment(self):
        """Test POST /api/rentals - create rental with automatic cash registration"""
        try:
            rental_data = {
                "customer_id": self.customer_id,
                "start_date": "2026-01-30",
                "end_date": "2026-02-02",
                "items": [{"barcode": self.item_barcode, "person_name": ""}],
                "payment_method": "cash",
                "total_amount": 75.0,
                "paid_amount": 75.0,
                "deposit": 0
            }
            
            response = requests.post(f"{BACKEND_URL}/rentals", json=rental_data, headers=self.headers)
            
            if response.status_code in [200, 201]:
                rental = response.json()
                
                # Verify rental created
                required_fields = ["id", "status", "customer_id"]
                missing_fields = [field for field in required_fields if field not in rental]
                
                if missing_fields:
                    self.log_test("Create Rental with Payment", False, f"Missing fields: {missing_fields}")
                    return False
                
                self.rental_id = rental["id"]
                self.log_test("Create Rental with Payment", True, 
                             f"Rental created: ID={rental['id']}, Amount=€{rental['total_amount']}, Status={rental['status']}")
                return True
            else:
                self.log_test("Create Rental with Payment", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Rental with Payment", False, f"Exception: {str(e)}")
            return False

    def test_verify_automatic_cash_movement(self):
        """Test GET /api/cash/movements - verify automatic cash movement from rental"""
        try:
            response = requests.get(f"{BACKEND_URL}/cash/movements?date={TEST_DATE}", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Verify Automatic Cash Movement", False, f"Status: {response.status_code}")
                return False
            
            movements = response.json()
            
            if not isinstance(movements, list):
                self.log_test("Verify Automatic Cash Movement", False, "Response is not a list")
                return False
            
            # Look for rental movement (should be at least 2 movements: our test + rental)
            rental_movements = [m for m in movements if m.get("category") == "rental" and m.get("amount") == 75.0]
            
            if not rental_movements:
                self.log_test("Verify Automatic Cash Movement", False, "No rental movement found with amount €75.0")
                return False
            
            rental_movement = rental_movements[0]
            
            # Verify movement properties
            expected_props = {
                "movement_type": "income",
                "amount": 75.0,
                "payment_method": "cash",
                "category": "rental"
            }
            
            for prop, expected_value in expected_props.items():
                if rental_movement.get(prop) != expected_value:
                    self.log_test("Verify Automatic Cash Movement", False, 
                                 f"Property {prop} mismatch. Expected: {expected_value}, Got: {rental_movement.get(prop)}")
                    return False
            
            # Verify session linkage
            if rental_movement.get("session_id") != self.session_id:
                self.log_test("Verify Automatic Cash Movement", False, 
                             f"Session ID mismatch. Expected: {self.session_id}, Got: {rental_movement.get('session_id')}")
                return False
            
            self.log_test("Verify Automatic Cash Movement", True, 
                         f"Automatic cash movement verified: €{rental_movement['amount']} {rental_movement['movement_type']}, Session: {rental_movement['session_id']}")
            return True
                
        except Exception as e:
            self.log_test("Verify Automatic Cash Movement", False, f"Exception: {str(e)}")
            return False

    def test_verify_final_summary(self):
        """Test GET /api/cash/summary - verify final totals after rental"""
        try:
            response = requests.get(f"{BACKEND_URL}/cash/summary?date={TEST_DATE}", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Verify Final Summary", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            # Expected totals: 100 opening + 50 test movement + 75 rental = 225
            expected_min_income = 125.0  # 50 + 75
            expected_min_balance = 225.0  # 100 + 125
            expected_min_movements = 2  # test movement + rental movement
            
            actual_income = data.get("total_income", 0)
            actual_balance = data.get("balance", 0)
            actual_movements = data.get("movements_count", 0)
            
            # Check minimums (there might be more from other tests)
            if actual_income < expected_min_income:
                self.log_test("Verify Final Summary", False, f"Income too low. Expected: ≥{expected_min_income}, Got: {actual_income}")
                return False
            
            if actual_movements < expected_min_movements:
                self.log_test("Verify Final Summary", False, f"Movement count too low. Expected: ≥{expected_min_movements}, Got: {actual_movements}")
                return False
            
            self.log_test("Verify Final Summary", True, 
                         f"Final summary correct: Income=€{actual_income}, Balance=€{actual_balance}, Movements={actual_movements}")
            return True
                
        except Exception as e:
            self.log_test("Verify Final Summary", False, f"Exception: {str(e)}")
            return False

    # FASE 5: CERRAR SESIÓN
    def test_close_session(self):
        """Test POST /api/cash/close - close cash session"""
        try:
            # Get current summary for closing data
            summary_response = requests.get(f"{BACKEND_URL}/cash/summary?date={TEST_DATE}", headers=self.headers)
            if summary_response.status_code != 200:
                self.log_test("Close Session - Get Summary", False, "Could not get summary for closing")
                return False
            
            summary = summary_response.json()
            expected_cash = summary.get("balance", 225.0)
            
            closing_data = {
                "date": TEST_DATE,
                "physical_cash": expected_cash,
                "card_total": 0,
                "expected_cash": expected_cash,
                "expected_card": 0,
                "discrepancy_cash": 0,
                "discrepancy_card": 0,
                "discrepancy_total": 0,
                "notes": "Test closure for session system"
            }
            
            response = requests.post(f"{BACKEND_URL}/cash/close", json=closing_data, headers=self.headers)
            
            if response.status_code in [200, 201]:
                closing = response.json()
                
                # Verify closing structure
                required_fields = ["id", "session_id", "closure_number"]
                missing_fields = [field for field in required_fields if field not in closing]
                
                if missing_fields:
                    self.log_test("Close Session", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Verify session linkage
                if closing.get("session_id") != self.session_id:
                    self.log_test("Close Session", False, f"Session ID mismatch. Expected: {self.session_id}, Got: {closing.get('session_id')}")
                    return False
                
                self.log_test("Close Session", True, 
                             f"Session closed successfully: ID={closing['id']}, Closure Number={closing['closure_number']}")
                return True
            else:
                self.log_test("Close Session", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Close Session", False, f"Exception: {str(e)}")
            return False

    def test_verify_no_active_session(self):
        """Test GET /api/cash/sessions/active - should return null after closing"""
        try:
            response = requests.get(f"{BACKEND_URL}/cash/sessions/active", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Verify No Active Session", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            if data is None or (isinstance(data, dict) and not data):
                self.log_test("Verify No Active Session", True, "No active session found (expected after closing)")
                return True
            else:
                self.log_test("Verify No Active Session", False, f"Still found active session: {data}")
                return False
                
        except Exception as e:
            self.log_test("Verify No Active Session", False, f"Exception: {str(e)}")
            return False

    def test_verify_summary_without_session(self):
        """Test GET /api/cash/summary - verify behavior without active session"""
        try:
            response = requests.get(f"{BACKEND_URL}/cash/summary?date={TEST_DATE}", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Verify Summary Without Session", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            # Should show session_active: false and reset totals
            if data.get("session_active") != False:
                self.log_test("Verify Summary Without Session", False, f"session_active should be false, got: {data.get('session_active')}")
                return False
            
            # Totals should be reset or show 0 for current session
            expected_fields = ["total_income", "movements_count", "balance"]
            for field in expected_fields:
                if field not in data:
                    self.log_test("Verify Summary Without Session", False, f"Missing field: {field}")
                    return False
            
            self.log_test("Verify Summary Without Session", True, 
                         f"Summary without session: Active={data['session_active']}, Income={data['total_income']}, Movements={data['movements_count']}")
            return True
                
        except Exception as e:
            self.log_test("Verify Summary Without Session", False, f"Exception: {str(e)}")
            return False

    # FASE 6: INTENTAR CREAR MOVIMIENTO SIN SESIÓN
    def test_movement_without_session_fails(self):
        """Test POST /api/cash/movements - should fail without active session"""
        try:
            movement_data = {
                "movement_type": "income",
                "amount": 30.0,
                "payment_method": "cash",
                "category": "other",
                "concept": "This should fail"
            }
            
            response = requests.post(f"{BACKEND_URL}/cash/movements", json=movement_data, headers=self.headers)
            
            if response.status_code == 400:
                error_text = response.text.lower()
                if "no active" in error_text and "session" in error_text:
                    self.log_test("Movement Without Session Fails", True, "Correctly prevented movement without active session")
                    return True
                else:
                    self.log_test("Movement Without Session Fails", False, f"Wrong error message: {response.text}")
                    return False
            else:
                self.log_test("Movement Without Session Fails", False, f"Expected 400 error, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Movement Without Session Fails", False, f"Exception: {str(e)}")
            return False

    # FASE 7: HISTORIAL DE SESIONES
    def test_session_history(self):
        """Test GET /api/cash/sessions - verify session history"""
        try:
            response = requests.get(f"{BACKEND_URL}/cash/sessions", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Session History", False, f"Status: {response.status_code}")
                return False
            
            sessions = response.json()
            
            if not isinstance(sessions, list):
                self.log_test("Session History", False, "Response is not a list")
                return False
            
            if len(sessions) == 0:
                self.log_test("Session History", False, "No sessions found in history")
                return False
            
            # Find our test session
            test_session = None
            for session in sessions:
                if session.get("id") == self.session_id:
                    test_session = session
                    break
            
            if not test_session:
                self.log_test("Session History", False, f"Test session {self.session_id} not found in history")
                return False
            
            # Verify session is closed
            if test_session.get("status") != "closed":
                self.log_test("Session History", False, f"Session status should be 'closed', got: {test_session.get('status')}")
                return False
            
            # Verify closure_id exists
            if not test_session.get("closure_id"):
                self.log_test("Session History", False, "Session missing closure_id")
                return False
            
            self.log_test("Session History", True, 
                         f"Session history verified: {len(sessions)} sessions found, test session status: {test_session['status']}")
            return True
                
        except Exception as e:
            self.log_test("Session History", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all cash session system tests"""
        print("🎯 STARTING CASH SESSION SYSTEM TESTING")
        print("Testing complete flow from session opening to rental creation with automatic cash registration")
        print("=" * 80)
        
        # Step 1: Authentication
        if not self.authenticate():
            print("❌ Authentication failed. Cannot continue tests.")
            return False
        
        # FASE 1: Sesiones de Caja
        print("\n📋 FASE 1: SESIONES DE CAJA")
        print("-" * 40)
        self.test_initial_session_state()
        self.test_open_new_session()
        self.test_verify_active_session()
        self.test_prevent_second_session()
        
        # FASE 2: Resumen de Caja Vinculado a Sesión
        print("\n📊 FASE 2: RESUMEN DE CAJA VINCULADO A SESIÓN")
        print("-" * 50)
        self.test_summary_with_active_session()
        
        # FASE 3: Crear Movimiento Vinculado a Sesión
        print("\n💰 FASE 3: CREAR MOVIMIENTO VINCULADO A SESIÓN")
        print("-" * 50)
        self.test_create_movement_with_session()
        self.test_verify_updated_summary()
        
        # FASE 4: Crear Alquiler (flujo completo con rental API)
        print("\n🎿 FASE 4: CREAR ALQUILER CON PAGO AUTOMÁTICO")
        print("-" * 50)
        self.test_get_test_customer()
        self.test_get_available_item()
        self.test_create_rental_with_payment()
        self.test_verify_automatic_cash_movement()
        self.test_verify_final_summary()
        
        # FASE 5: Cerrar Sesión
        print("\n🔒 FASE 5: CERRAR SESIÓN")
        print("-" * 30)
        self.test_close_session()
        self.test_verify_no_active_session()
        self.test_verify_summary_without_session()
        
        # FASE 6: Intentar Crear Movimiento Sin Sesión
        print("\n🚫 FASE 6: OPERACIONES SIN SESIÓN ACTIVA")
        print("-" * 45)
        self.test_movement_without_session_fails()
        
        # FASE 7: Historial de Sesiones
        print("\n📚 FASE 7: HISTORIAL DE SESIONES")
        print("-" * 35)
        self.test_session_history()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TEST RESULTS SUMMARY:")
        print("=" * 80)
        
        for result in self.test_results:
            print(result)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if "✅ PASS" in r])
        
        print(f"\n🎯 OVERALL RESULT: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("✅ ALL CASH SESSION SYSTEM TESTS PASSED!")
            print("🎉 Sistema de Sesiones de Caja y Pago de Alquileres working correctly!")
            return True
        else:
            print("❌ SOME TESTS FAILED!")
            print("💥 Cash Session System has issues that need attention!")
            return False

def main():
    """Main test execution"""
    tester = CashSessionTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Cash Session System is working correctly!")
        sys.exit(0)
    else:
        print("\n💥 Cash Session System has issues that need attention!")
        sys.exit(1)

if __name__ == "__main__":
    main()