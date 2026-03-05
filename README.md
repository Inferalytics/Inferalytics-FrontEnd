# Inferalytics Backend API

A FastAPI-based backend application with JWT authentication and a complete mathematical optimization workflow using the Newton-Raphson method for hierarchical data analysis.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Applications](#applications)
  - [Authentication App](#authentication-app)
  - [Batching App](#batching-app)
  - [Optimization App](#optimization-app)
- [Complete Workflow](#complete-workflow)
- [API Endpoints Reference](#api-endpoints-reference)
- [Database Architecture](#database-architecture)
- [Environment Variables](#environment-variables)

---

## Overview

Inferalytics Backend is a modular FastAPI application designed with:
- **JWT-based Authentication** - Secure user authentication with access & refresh tokens
- **Batch Management** - Isolated workspaces for user data
- **Data Upload & Processing** - Support for CSV, Excel, Word, and JSON data
- **Numerical Optimization** - Newton-Raphson method for EGR convergence
- **Time Series Forecasting** - Holt-Winters Triple Exponential Smoothing for growth rate prediction
- **SQLite Databases** - Separate databases for each application domain
- **Feature-based Architecture** - Organized by apps (auth, batching, optimization)

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Web framework |
| **Pydantic** | Data validation & serialization |
| **SQLAlchemy** | ORM & database toolkit |
| **SQLite** | Database (separate DB per app) |
| **python-jose** | JWT token handling |
| **passlib + bcrypt** | Password hashing |
| **NumPy** | Numerical computations |
| **Pandas** | Data parsing (CSV, Excel) |
| **python-docx** | Word document parsing |
| **Uvicorn** | ASGI server |

---

## Project Structure

```
Backend/
├── main.py                         # FastAPI application entry point
├── manage.py                       # Server runner (python manage.py)
├── .env                            # Environment variables
├── requirements.txt                # Python dependencies
├── .gitignore                      # Git ignore rules
│
├── apps/                           # Feature-based applications
│   ├── auth/                       # 🔐 Authentication app
│   │   ├── urls.py
│   │   ├── signup/
│   │   │   ├── serializers/
│   │   │   └── views/post/signup/
│   │   ├── login/
│   │   │   ├── serializers/
│   │   │   └── views/
│   │   │       ├── post/authenticate/
│   │   │       ├── post/refresh_token/
│   │   │       └── get/detail/
│   │   └── logout/
│   │       ├── serializers/
│   │       └── views/post/logout/
│   │
│   ├── batching/                   # 📦 Batch management app
│   │   ├── urls.py
│   │   ├── create_batch/
│   │   │   ├── serializers/
│   │   │   └── views/post/create/
│   │   ├── delete_batch/
│   │   │   ├── serializers/
│   │   │   └── views/delete/remove/
│   │   ├── switch_batch/
│   │   │   ├── serializers/
│   │   │   └── views/post/switch/
│   │   └── list_batch/
│   │       ├── serializers/
│   │       └── views/get/list/
│   │
│   └── optimization/               # 🧮 Optimization app
│       ├── urls.py
│       ├── data_population/
│       │   ├── serializers/
│       │   └── views/post/upload/
│       ├── data_retrieval/
│       │   ├── serializers/
│       │   └── views/get/retrieve/
│       ├── vectorisation/
│       │   ├── serializers/
│       │   └── views/post/vectorise/
│       ├── aggregation/
│       │   ├── serializers/
│       │   └── views/post/aggregate/
│       ├── egr/
│       │   ├── serializers/
│       │   └── views/
│       │       ├── post/create/
│       │       └── get/egr/
│       ├── fixed_values/
│       │   ├── serializers/
│       │   └── views/
│       │       ├── post/fix/
│       │       └── get/fixed_values/
│       └── newton_raphson/
│           ├── serializers/
│           └── views/
│               ├── post/optimize/
│               └── get/retrieve/
│       ├── data_time/              # 📅 Data Time Range
│       │   ├── serializers/
│       │   └── views/
│       │       ├── post/set/
│       │       └── get/data_time/
│       ├── growth_time/             # 🎯 Growth Target Time
│       │   ├── serializers/
│       │   └── views/
│       │       ├── post/set/
│       │       └── get/growth_time/
│       └── forecast/                # 📊 Holt-Winters Forecasting
│           ├── serializers/
│           └── views/
│               ├── post/calculate/
│               └── get/forecast/
│
├── data/                           # Database layer
│   ├── auth/
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── user_repository.py
│   │   ├── token_repository.py
│   │   └── users.db
│   ├── batching/
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── batch_repository.py
│   │   └── batching.db
│   ├── populated_data/
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── data_repository.py
│   │   └── populated_data.db
│   ├── vectorised_data/
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── vectorised_data_repository.py
│   │   └── vectorised_data.db
│   ├── aggregated_data/
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── aggregated_data_repository.py
│   │   └── aggregated_data.db
│   ├── egr_data/
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── egr_repository.py
│   │   └── egr_data.db
│   ├── fixed_values/
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── fixed_values_repository.py
│   │   └── fixed_values.db
│   └── newton_raphson_data/
│       ├── database.py
│       ├── models.py
│       ├── newton_raphson_repository.py
│       └── newton_raphson_data.db
│   ├── data_time/
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── data_time_repository.py
│   │   └── data_time.db
│   ├── growth_time/
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── growth_time_repository.py
│   │   └── growth_time.db
│   └── forecast_results/
│       ├── database.py
│       ├── models.py
│       ├── forecast_repository.py
│       └── forecast_results.db
│
└── shared/                         # Shared utilities & services
    ├── config/
    │   └── settings.py
    ├── dependencies.py
    ├── models/
    │   └── user_models.py
    ├── services/
    │   ├── signup_service.py
    │   ├── login_service.py
    │   ├── logout_service.py
    │   └── user_service.py
    └── utils/
        ├── jwt_utils.py
        ├── password_utils.py
        └── logger.py
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- pip

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Backend

# Create virtual environment
python -m venv .inferalytics-backend-venv
source .inferalytics-backend-venv/bin/activate  # On Windows: .inferalytics-backend-venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (see Environment Variables section)

# Run the server
python manage.py
```

The API will be available at `http://localhost:8000`

### API Documentation

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## Applications

---

## Authentication App

### Overview

The authentication app provides secure JWT-based user authentication with access and refresh tokens, persistent token blacklisting, and user management.

### Architecture

```
apps/auth/
├── urls.py                              # Main router
├── signup/
│   ├── serializers/
│   │   └── signup_serializers.py        # SignupRequest, SignupResponse
│   └── views/post/signup/
│       └── auth_views_post_signup.py    # POST /auth/signup
├── login/
│   ├── serializers/
│   │   └── login_serializers.py         # LoginRequest, LoginResponse, RefreshTokenRequest
│   └── views/
│       ├── post/authenticate/
│       │   └── auth_views_post_authenticate.py  # POST /auth/login
│       ├── post/refresh_token/
│       │   └── auth_views_post_refresh_token.py # POST /auth/refresh
│       └── get/detail/
│           └── auth_views_get_detail.py         # GET /auth/me
└── logout/
    ├── serializers/
    │   └── logout_serializers.py        # LogoutResponse
    └── views/post/logout/
        └── auth_views_post_logout.py    # POST /auth/logout
```

### JWT Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           JWT AUTHENTICATION FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │   .env File  │
                              │ JWT_SECRET   │
                              │ JWT_ALGORITHM│
                              │ EXPIRY_TIMES │
                              └──────┬───────┘
                                     │
                                     ▼
┌─────────────┐    ┌─────────────────────────────────┐    ┌─────────────────┐
│   SIGNUP    │    │         settings.py             │    │     LOGIN       │
│             │    │   (loads env configuration)     │    │                 │
│ POST /auth/ │    └─────────────────────────────────┘    │ POST /auth/     │
│   signup    │                    │                      │   login         │
└──────┬──────┘                    │                      └────────┬────────┘
       │                           ▼                               │
       │              ┌─────────────────────────┐                  │
       │              │      jwt_utils.py       │                  │
       │              │                         │                  │
       │              │ • create_access_token() │                  │
       │              │ • create_refresh_token()│                  │
       │              │ • verify_token()        │                  │
       │              └────────────┬────────────┘                  │
       │                           │                               │
       ▼                           ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              JWT TOKENS                                      │
│                                                                             │
│  ACCESS TOKEN                           REFRESH TOKEN                       │
│  ┌─────────────────────────────┐       ┌─────────────────────────────┐     │
│  │ Header: { alg: HS256 }      │       │ Header: { alg: HS256 }      │     │
│  │ Payload: {                  │       │ Payload: {                  │     │
│  │   sub: user_id,             │       │   sub: user_id,             │     │
│  │   username: "...",          │       │   username: "...",          │     │
│  │   type: "access",           │       │   type: "refresh",          │     │
│  │   exp: 7 days               │       │   exp: 30 days              │     │
│  │ }                           │       │ }                           │     │
│  │ Signature: HMACSHA256(...)  │       │ Signature: HMACSHA256(...)  │     │
│  └─────────────────────────────┘       └─────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PROTECTED ENDPOINTS                                 │
│                                                                             │
│   Request + Bearer Token                                                    │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐    │
│   │ dependencies.py │────▶│ token_repository │────▶│ user_repository  │    │
│   │ get_current_user│     │ (check blacklist)│     │ (get user by id) │    │
│   └─────────────────┘     └──────────────────┘     └──────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/signup` | ❌ | Register new user |
| `POST` | `/auth/login` | ❌ | Authenticate user |
| `POST` | `/auth/logout` | ✅ | Invalidate token (blacklist) |
| `POST` | `/auth/refresh` | ❌ | Refresh access token |
| `GET` | `/auth/me` | ✅ | Get current user details |

### Database: `users.db`

| Table | Fields |
|-------|--------|
| `users` | id, email, username, hashed_password, created_at |
| `blacklisted_tokens` | id, token, user_id, blacklisted_at |

### File Roles

| File | Role |
|------|------|
| `signup_serializers.py` | Validates signup request (username, email, password) |
| `auth_views_post_signup.py` | Creates new user, hashes password, returns tokens |
| `login_serializers.py` | Validates login request (username, password) |
| `auth_views_post_authenticate.py` | Verifies credentials, returns JWT tokens |
| `auth_views_post_refresh_token.py` | Validates refresh token, issues new access token |
| `auth_views_get_detail.py` | Returns current authenticated user info |
| `auth_views_post_logout.py` | Adds token to blacklist, invalidates session |
| `user_repository.py` | CRUD operations for User model |
| `token_repository.py` | Manages token blacklist in database |

---

## Batching App

### Overview

The batching app manages isolated workspaces (batches) for user data. Each batch acts as a separate container where all optimization data is stored independently.

### Architecture

```
apps/batching/
├── urls.py                              # Main router
├── create_batch/
│   ├── serializers/
│   │   └── create_batch_serializers.py  # CreateBatchRequest, CreateBatchResponse
│   └── views/post/create/
│       └── batching_views_post_create.py # POST /batching/create
├── delete_batch/
│   ├── serializers/
│   │   └── delete_batch_serializers.py  # DeleteBatchRequest, DeleteBatchResponse
│   └── views/delete/remove/
│       └── batching_views_delete_remove.py # DELETE /batching/delete
├── switch_batch/
│   ├── serializers/
│   │   └── switch_batch_serializers.py  # SwitchBatchRequest, SwitchBatchResponse
│   └── views/post/switch/
│       └── batching_views_post_switch.py # POST /batching/switch
└── list_batch/
    ├── serializers/
    │   └── list_batch_serializers.py    # ListBatchResponse
    └── views/get/list/
        └── batching_views_get_list.py   # GET /batching/list
```

### Batch Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BATCH MANAGEMENT                                │
└─────────────────────────────────────────────────────────────────────────────┘

    User A                                           User B
       │                                                │
       ▼                                                ▼
┌─────────────┐                                  ┌─────────────┐
│ Create      │                                  │ Create      │
│ Batch "Q1"  │                                  │ Batch "2024"│
└──────┬──────┘                                  └──────┬──────┘
       │                                                │
       ▼                                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              batching.db                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Batch Table                                                          │    │
│  │ ┌────────────────────────────────────────────────────────────────┐  │    │
│  │ │ id │ batch_id (UUID)              │ user_id │ name │ is_active │  │    │
│  │ ├────┼──────────────────────────────┼─────────┼──────┼───────────│  │    │
│  │ │ 1  │ 7c79f2da7804172c8777755b96.. │    1    │  Q1  │   true    │  │    │
│  │ │ 2  │ 9435b52e90a040438da22f4600.. │    1    │  Q2  │   false   │  │    │
│  │ │ 3  │ 62f3d1ed1d7146e9ab2eb9e440.. │    2    │ 2024 │   true    │  │    │
│  │ └────────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
           ┌─────────────────────────────────────────────────┐
           │  All optimization data is linked via batch_id   │
           │                                                 │
           │  • populated_data.db → batch_id                 │
           │  • vectorised_data.db → batch_id                │
           │  • aggregated_data.db → batch_id                │
           │  • egr_data.db → batch_id                       │
           │  • fixed_values.db → batch_id                   │
           │  • newton_raphson_data.db → batch_id            │
           └─────────────────────────────────────────────────┘
```

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/batching/create` | ✅ | Create a new batch |
| `POST` | `/batching/switch` | ✅ | Switch to a different batch (make active) |
| `DELETE` | `/batching/delete` | ✅ | Delete a batch |
| `GET` | `/batching/list` | ✅ | List all user's batches |

### Database: `batching.db`

| Table | Fields |
|-------|--------|
| `batches` | id, batch_id (UUID), user_id, batch_name, is_active, created_at |

### File Roles

| File | Role |
|------|------|
| `create_batch_serializers.py` | Validates batch name, formats response with UUID |
| `batching_views_post_create.py` | Creates batch with UUID, deactivates other batches |
| `switch_batch_serializers.py` | Validates batch_id for switching |
| `batching_views_post_switch.py` | Sets target batch as active, deactivates others |
| `delete_batch_serializers.py` | Validates batch_id for deletion |
| `batching_views_delete_remove.py` | Deletes batch and associated data |
| `list_batch_serializers.py` | Formats batch list response |
| `batching_views_get_list.py` | Returns all batches for current user |
| `batch_repository.py` | CRUD operations for Batch model |

---

## Optimization App

### Overview

The optimization app implements a complete numerical optimization workflow using the Newton-Raphson method to adjust data values until a target Expected Growth Rate (EGR) is achieved.

### Architecture

```
apps/optimization/
├── urls.py                                  # Main router (includes all sub-routers)
│
├── data_population/                         # 📥 DATA UPLOAD
│   ├── urls.py
│   ├── serializers/
│   │   └── data_population_serializers.py
│   └── views/post/upload/
│       └── optimization_views_post_upload.py
│
├── data_retrieval/                          # 📤 DATA RETRIEVAL
│   ├── urls.py
│   ├── serializers/
│   │   └── data_retrieval_serializers.py
│   └── views/get/retrieve/
│       └── optimization_views_get_retrieve.py
│
├── vectorisation/                           # 🔢 VECTORISATION
│   ├── urls.py
│   ├── serializers/
│   │   └── vectorisation_serializers.py
│   └── views/post/vectorise/
│       └── optimization_views_post_vectorise.py
│
├── aggregation/                             # ➕ AGGREGATION
│   ├── urls.py
│   ├── serializers/
│   │   └── aggregation_serializers.py
│   └── views/post/aggregate/
│       └── optimization_views_post_aggregate.py
│
├── egr/                                     # 📈 EGR (Expected Growth Rate)
│   ├── urls.py
│   ├── serializers/
│   │   └── egr_serializers.py
│   └── views/
│       ├── post/create/
│       │   └── optimization_views_post_create.py
│       └── get/egr/
│           └── optimization_views_get_egr.py
│
├── fixed_values/                            # 🔒 FIXED VALUES
│   ├── urls.py
│   ├── serializers/
│   │   └── fixed_values_serializers.py
│   └── views/
│       ├── post/fix/
│       │   └── optimization_views_post_fix.py
│       └── get/fixed_values/
│           └── optimization_views_get_fixed_values.py
│
└── newton_raphson/                          # 🧮 NEWTON-RAPHSON
    ├── urls.py
    ├── serializers/
    │   └── newton_raphson_serializers.py
    └── views/
        ├── post/optimize/
        │   └── optimization_views_post_optimize.py
        └── get/retrieve/
            └── optimization_views_get_retrieve.py
```

### Endpoints

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | `POST` | `/optimization/data-population/upload-file` | ✅ | Upload CSV/Excel/Word file |
| 2 | `POST` | `/optimization/data-population/upload-json` | ✅ | Upload JSON data |
| 3 | `GET` | `/optimization/data-retrieval/retrieve` | ✅ | Retrieve uploaded data |
| 4 | `POST` | `/optimization/vectorisation/vectorise` | ✅ | Convert data to vector |
| 5 | `POST` | `/optimization/aggregation/aggregate` | ✅ | Apply aggregation matrix |
| 6 | `POST` | `/optimization/egr/create` | ✅ | Set target EGR value |
| 7 | `GET` | `/optimization/egr/retrieve` | ✅ | Get saved EGR value |
| 8 | `POST` | `/optimization/fixed-values/fix` | ✅ | Fix specific values |
| 9 | `GET` | `/optimization/fixed-values/retrieve` | ✅ | Get fixed values |
| 10 | `POST` | `/optimization/newton-raphson/optimize` | ✅ | Run Newton-Raphson optimization |
| 11 | `GET` | `/optimization/newton-raphson/retrieve` | ✅ | Get optimized values |
| 12 | `POST` | `/optimization/data-time/set` | ✅ | Set data time range (e.g., Q1_2024-Q4_2025) |
| 13 | `GET` | `/optimization/data-time/get` | ✅ | Get data time range |
| 14 | `POST` | `/optimization/growth-time/set` | ✅ | Set growth target time (e.g., Q2_2026) |
| 15 | `GET` | `/optimization/growth-time/get` | ✅ | Get growth target time |
| 16 | `POST` | `/optimization/forecast/calculate` | ✅ | Calculate Holt-Winters forecast |
| 17 | `GET` | `/optimization/forecast/get` | ✅ | Get forecast results |

### Databases

| Database | Model | Key Fields |
|----------|-------|------------|
| `populated_data.db` | PopulatedData | filename, file_type, data_content, batch_id |
| `vectorised_data.db` | VectorisedData | vector_data, vector_length, column_mapping |
| `aggregated_data.db` | AggregatedData | aggregated_values, hierarchy_levels |
| `egr_data.db` | EGRData | egr_value, batch_id |
| `fixed_values.db` | FixedValue | vector_index, row_number, column_number, fixed_value |
| `newton_raphson_data.db` | NewtonRaphsonData | optimized_vector, iterations, final_egr, converged |
| `data_time.db` | DataTime | start_time, end_time, period_type, batch_id |
| `growth_time.db` | GrowthTime | target_time, batch_id |
| `forecast_results.db` | ForecastResult | forecasted_value, predicted_growth_rate, yearly_egr_estimation, batch_id |

### Module Details

#### 1. Data Population
| File | Role |
|------|------|
| `data_population_serializers.py` | `DataUploadResponse`, `PopulatedDataItem` |
| `optimization_views_post_upload.py` | Parses files (CSV, Excel, Word, JSON), sanitizes NaN, stores in DB |
| `data_repository.py` | `create_populated_data()`, `get_populated_data_by_batch()` |

#### 2. Data Retrieval
| File | Role |
|------|------|
| `data_retrieval_serializers.py` | `PopulatedDataWithContent`, `RetrieveDataResponse` |
| `optimization_views_get_retrieve.py` | Fetches uploaded data for active batch |

#### 3. Vectorisation
| File | Role |
|------|------|
| `vectorisation_serializers.py` | `VectorisedDataItem`, `VectorisationResponse` |
| `optimization_views_post_vectorise.py` | Flattens data to NumPy array, creates column_mapping |
| `vectorised_data_repository.py` | CRUD for VectorisedData model |

#### 4. Aggregation
| File | Role |
|------|------|
| `aggregation_serializers.py` | `AggregatedDataItem`, `AggregationResponse` |
| `optimization_views_post_aggregate.py` | Builds hierarchy, creates aggregation matrix, matrix multiplication |
| `aggregated_data_repository.py` | CRUD for AggregatedData model |

#### 5. EGR
| File | Role |
|------|------|
| `egr_serializers.py` | `EGRRequest`, `EGRResponse`, `RetrieveEGRResponse` |
| `optimization_views_post_create.py` | Saves/updates target EGR value |
| `optimization_views_get_egr.py` | Retrieves saved EGR value |
| `egr_repository.py` | CRUD for EGRData model |

#### 6. Fixed Values
| File | Role |
|------|------|
| `fixed_values_serializers.py` | `FixedValueItem`, `FixedValuesRequest`, `FixedValuesResponse` |
| `optimization_views_post_fix.py` | Validates value at index, stores fixed values |
| `optimization_views_get_fixed_values.py` | Retrieves all fixed values |
| `fixed_values_repository.py` | CRUD for FixedValue model |

#### 7. Newton-Raphson
| File | Role |
|------|------|
| `newton_raphson_serializers.py` | `NewtonRaphsonResponse`, `RetrieveNewtonRaphsonResponse` |
| `optimization_views_post_optimize.py` | **Core optimization**: iterations, EGR calculation, convergence |
| `optimization_views_get_retrieve.py` | Retrieves optimized values |
| `newton_raphson_repository.py` | CRUD for NewtonRaphsonData model |

#### 8. Data Time Range
| File | Role |
|------|------|
| `data_time_serializers.py` | `DataTimeRequest`, `DataTimeResponse`, `GetDataTimeResponse` |
| `optimization_views_post_set.py` | Sets the time range of populated data (e.g., Q1_2024-Q4_2025) |
| `optimization_views_get_data_time.py` | Retrieves the data time range |
| `data_time_repository.py` | CRUD for DataTime model |

#### 9. Growth Target Time
| File | Role |
|------|------|
| `growth_time_serializers.py` | `GrowthTimeRequest`, `GrowthTimeResponse`, `GetGrowthTimeResponse` |
| `optimization_views_post_set.py` | Sets the target time for growth rate calculation (e.g., Q2_2026) |
| `optimization_views_get_growth_time.py` | Retrieves the growth target time |
| `growth_time_repository.py` | CRUD for GrowthTime model |

#### 10. Forecasting (Holt-Winters)
| File | Role |
|------|------|
| `forecast_serializers.py` | `ForecastRequest`, `ForecastResponse`, `GetForecastResponse` |
| `optimization_views_post_calculate.py` | **Holt-Winters forecasting**: calculates predicted growth rate and yearly EGR estimation |
| `optimization_views_get_forecast.py` | Retrieves forecast results |
| `forecast_repository.py` | CRUD for ForecastResult model |

### Newton-Raphson Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| `max_iterations` | 1000 | Maximum optimization iterations |
| `tolerance` | 0.000001 | EGR convergence threshold |
| `max_adjustment` | ±1 | Maximum value change per iteration |

### Forecasting with Holt-Winters Triple Exponential Smoothing

The forecasting module uses **Holt-Winters Triple Exponential Smoothing** to predict future growth rates based on historical time series data.

#### Overview

The forecasting system:
1. **Accepts time range** of populated data (e.g., Q1_2024 to Q4_2025)
2. **Accepts target time** for growth rate prediction (e.g., Q2_2026)
3. **Uses vectorised data** to generate time series
4. **Applies Holt-Winters** to forecast the target quarter
5. **Calculates Year-over-Year (YoY) growth rate** by comparing to the same quarter from previous year
6. **Estimates yearly EGR** by forecasting all quarters of the target year and comparing to user's EGR

#### Holt-Winters Formula

**Triple Exponential Smoothing** with multiplicative seasonality:

**Components:**
- **Level (L_t)**: Baseline value
- **Trend (T_t)**: Growth/decline per period
- **Seasonal Factor (S_t)**: Seasonal multiplier for each quarter

**Update Equations:**
```
Level:    L_t = α × (y_t / S_{t-s}) + (1 - α) × (L_{t-1} + T_{t-1})
Trend:    T_t = β × (L_t - L_{t-1}) + (1 - β) × T_{t-1}
Seasonal: S_t = γ × (y_t / L_t) + (1 - γ) × S_{t-s}
```

**Forecast Formula:**
```
Forecast_{t+k} = (L_t + k × T_t) × S_{t+k}
```

Where:
- `α` (alpha) = Level smoothing parameter (0.3 default)
- `β` (beta) = Trend smoothing parameter (0.1 default)
- `γ` (gamma) = Seasonal smoothing parameter (0.2 default)
- `k` = Periods ahead (1, 2, 3, 4 for Q1-Q4)

#### Parameter Roles

| Parameter | Controls | Low Value (0.1) | High Value (0.5+) |
|-----------|----------|-----------------|-------------------|
| **α (Alpha)** | Level responsiveness | Smooth, stable | Reactive to changes |
| **β (Beta)** | Trend adaptability | Stable trend | Volatile trend |
| **γ (Gamma)** | Seasonal adaptation | Fixed patterns | Changing patterns |

**Auto-Optimization**: If parameters are not provided, the system uses grid search to find optimal values that minimize Mean Squared Error on historical data.

#### Year-over-Year (YoY) Growth Rate Calculation

The system calculates **meaningful growth rates** by comparing the forecasted quarter to the **same quarter from the previous year**:

**Example:**
- **Target**: Q2_2026 = 54,037
- **Comparison**: Q2_2025 = 50,900
- **YoY Growth Rate**: (54,037 - 50,900) / 50,900 = **6.16%**

This approach is more meaningful than comparing to the last period (Q4_2025), especially for seasonal data.

#### Yearly EGR Estimation

After forecasting the target quarter, the system:

1. **Forecasts all quarters** of the target year using Holt-Winters:
   - Q1_2026: Forecast (1 period ahead)
   - Q2_2026: Forecast (2 periods ahead) ← Target quarter
   - Q3_2026: Forecast (3 periods ahead)
   - Q4_2026: Forecast (4 periods ahead)

2. **Calculates yearly total**:
   ```
   Total_2026 = Q1_2026 + Q2_2026 + Q3_2026 + Q4_2026
   ```

3. **Compares to previous year**:
   ```
   Estimated Yearly EGR = (Total_2026 - Total_2025) / Total_2025
   ```

4. **Compares to user's EGR**:
   ```
   EGR Difference = Estimated Yearly EGR - User EGR
   ```

**Response includes:**
- Individual quarter forecasts
- Quarter-specific YoY growth rates
- Estimated yearly EGR
- Comparison to user's EGR
- Original and updated vector values (applying growth to non-fixed values)

#### Forecast Response Structure

```json
{
  "forecasted_value": 54036.61,
  "yoy_comparison": {
    "comparison_period": "Q2_2025",
    "comparison_value": 50900.0,
    "description": "Year-over-Year: Q2_2026 vs Q2_2025"
  },
  "predicted_growth_rate": 0.061623,
  "predicted_growth_rate_percentage": "6.16%",
  "yearly_egr_estimation": {
    "user_egr": 0.15,
    "estimated_yearly_egr": 0.0562,
    "egr_difference": -0.0938,
    "estimated_quarters": {
      "Q1_2026": 45923.45,
      "Q2_2026": 54036.61,
      "Q3_2026": 51234.78,
      "Q4_2026": 78654.32
    },
    "quarter_growth_rates": {
      "Q1_2026": "4.37%",
      "Q2_2026": "6.16%",
      "Q3_2026": "3.93%",
      "Q4_2026": "7.01%"
    },
    "estimated_target_year_total": 229849.16,
    "previous_year_total": 217700.0
  },
  "original_vector": [...],
  "updated_vector": [...],
  "fixed_indices": [0]
}
```

---

## Complete Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              COMPLETE OPTIMIZATION WORKFLOW                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────────┐
                                    │   USER LOGIN     │
                                    │  (JWT Token)     │
                                    └────────┬─────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: CREATE BATCH                                                                    │
│  POST /batching/create  →  Creates isolated workspace                                    │
│  POST /batching/switch  →  Activates the batch                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: UPLOAD DATA                                                                     │
│  POST /optimization/data-population/upload-file                                          │
│                                                                                          │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐                                 │
│   │  CSV    │   │  Excel  │   │  Word   │   │  JSON   │                                 │
│   │  .csv   │   │  .xlsx  │   │  .docx  │   │  POST   │                                 │
│   └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘                                 │
│        └─────────────┴─────────────┴─────────────┘                                       │
│                              │                                                           │
│                              ▼                                                           │
│                    ┌─────────────────┐          ┌─────────────────┐                      │
│                    │  Parse & Store  │   ───▶   │populated_data.db│                      │
│                    │  Sanitize NaN   │          └─────────────────┘                      │
│                    └─────────────────┘                                                   │
│                                                                                          │
│  GET /optimization/data-retrieval/retrieve  ←  View uploaded data                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: VECTORISE DATA                                                                  │
│  POST /optimization/vectorisation/vectorise                                              │
│                                                                                          │
│   Raw Data (Table)                      NumPy Vector                                     │
│   ┌────┬────┬────┬────┬────┐           ┌─────────────────────────────────┐              │
│   │500 │600 │700 │800 │900 │           │[500,600,700,800,900,600,700,... │              │
│   ├────┼────┼────┼────┼────┤    ──▶    │ 800,900,1000,700,800,900,1000,  │              │
│   │600 │700 │800 │900 │1000│           │ 1100,800,900,1000,1100,1200...] │              │
│   └────┴────┴────┴────┴────┘           └─────────────────────────────────┘              │
│                                        + column_mapping (row,col→index)                  │
│                                                           │                              │
│                                                           ▼                              │
│                                               ┌──────────────────────┐                   │
│                                               │  vectorised_data.db  │                   │
│                                               └──────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                             │
                          ┌──────────────────┼──────────────────┐
                          │                  │                  │
                          ▼                  ▼                  ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐ ┌─────────────────────────┐
│  STEP 4: SET EGR            │ │  STEP 5: FIX VALUES         │ │  STEP 6: AGGREGATE      │
│  POST /optimization/        │ │  POST /optimization/        │ │  POST /optimization/    │
│       egr/create            │ │       fixed-values/fix      │ │       aggregation/      │
│                             │ │                             │ │       aggregate         │
│  User sets target EGR       │ │  User fixes values at       │ │  Matrix multiply with   │
│  e.g., 0.15 (15% growth)    │ │  specific positions         │ │  aggregation matrix     │
│                             │ │  (row, column, value)       │ │                         │
│  GET /egr/retrieve          │ │  GET /fixed-values/retrieve │ │  Builds hierarchy from  │
│                             │ │                             │ │  column_mapping         │
│     ┌─────────────┐         │ │     ┌─────────────┐         │ │     ┌─────────────┐     │
│     │egr_data.db  │         │ │     │fixed_values │         │ │     │aggregated   │     │
│     └─────────────┘         │ │     │    .db      │         │ │     │  _data.db   │     │
│                             │ │     └─────────────┘         │ │     └─────────────┘     │
└─────────────────────────────┘ └─────────────────────────────┘ └─────────────────────────┘
                          │                  │                  │
                          └──────────────────┼──────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  STEP 7: NEWTON-RAPHSON OPTIMIZATION                                                     │
│  POST /optimization/newton-raphson/optimize                                              │
│                                                                                          │
│   Inputs:                                                                                │
│   ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐                 │
│   │ Vectorised Data │      │  Fixed Values   │      │   Target EGR    │                 │
│   │ [500,600,700...] │      │ [index: 0]      │      │     0.15        │                 │
│   └────────┬────────┘      └────────┬────────┘      └────────┬────────┘                 │
│            └────────────────────────┼────────────────────────┘                           │
│                                     │                                                    │
│                                     ▼                                                    │
│            ┌────────────────────────────────────────────────┐                            │
│            │        NEWTON-RAPHSON ITERATION LOOP           │                            │
│            │                                                │                            │
│            │  1. Calculate adjustment per value             │                            │
│            │     x_new = x_old - (egr_curr - egr_tgt)      │                            │
│            │              × old_total                       │                            │
│            │                                                │                            │
│            │  2. Cap adjustment to ±1 per iteration         │                            │
│            │                                                │                            │
│            │  3. Skip fixed values (don't modify)           │                            │
│            │                                                │                            │
│            │  4. Aggregate new values                       │                            │
│            │                                                │                            │
│            │  5. Calculate current EGR                      │                            │
│            │     EGR = (new_total - old_total) / old_total │                            │
│            │                                                │                            │
│            │  6. Check convergence                          │                            │
│            │     |current_egr - target_egr| < 0.000001     │                            │
│            │                                                │                            │
│            │  REPEAT until converged (max 1000 iterations)  │                            │
│            └────────────────────────────────────────────────┘                            │
│                                     │                                                    │
│                          ┌──────────┴──────────┐                                         │
│                          │                     │                                         │
│                   ┌────────────┐       ┌─────────────┐                                   │
│                   │ Converged! │       │ Not yet...  │──────────────┐                    │
│                   │   EXIT     │       │   REPEAT    │              │                    │
│                   └─────┬──────┘       └─────────────┘              │                    │
│                         │                                           │                    │
│                         ▼                                           │                    │
│            ┌─────────────────────────────────────────────┐          │                    │
│            │              OPTIMIZATION RESULT            │◀─────────┘                    │
│            │  optimized_vector: [500, 637, 743, 850...]  │                               │
│            │  iterations: 162                            │                               │
│            │  target_egr: 0.15                           │                               │
│            │  final_egr: 0.149999                        │                               │
│            │  converged: true                            │                               │
│            │  fixed_indices: [0]                         │                               │
│            └──────────────────────┬──────────────────────┘                               │
│                                   │                                                      │
│                                   ▼                                                      │
│                    ┌──────────────────────────┐                                          │
│                    │  newton_raphson_data.db  │                                          │
│                    └──────────────────────────┘                                          │
│                                                                                          │
│  GET /optimization/newton-raphson/retrieve  ←  View optimized values                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints Reference

### Authentication (`/auth`)

| Method | Endpoint | Auth | Request Body | Response |
|--------|----------|------|--------------|----------|
| `POST` | `/auth/signup` | ❌ | `{username, email, password}` | `{access_token, refresh_token, user}` |
| `POST` | `/auth/login` | ❌ | `{username, password}` | `{access_token, refresh_token, user}` |
| `POST` | `/auth/logout` | ✅ | - | `{message}` |
| `POST` | `/auth/refresh` | ❌ | `{refresh_token}` | `{access_token}` |
| `GET` | `/auth/me` | ✅ | - | `{user_id, username, email}` |

### Batching (`/batching`)

| Method | Endpoint | Auth | Request Body | Response |
|--------|----------|------|--------------|----------|
| `POST` | `/batching/create` | ✅ | `{batch_name}` | `{batch_id, batch_name, is_active}` |
| `POST` | `/batching/switch` | ✅ | `{batch_id}` | `{batch_id, is_active}` |
| `DELETE` | `/batching/delete` | ✅ | `{batch_id}` | `{message}` |
| `GET` | `/batching/list` | ✅ | - | `{batches: [...]}` |

### Optimization (`/optimization`)

| Method | Endpoint | Auth | Request Body | Response |
|--------|----------|------|--------------|----------|
| `POST` | `/optimization/data-population/upload-file` | ✅ | `file (multipart)` | `{data_id, filename, batch_id}` |
| `POST` | `/optimization/data-population/upload-json` | ✅ | `{data: [...]}` | `{data_id, batch_id}` |
| `GET` | `/optimization/data-retrieval/retrieve` | ✅ | - | `{data_records: [...]}` |
| `POST` | `/optimization/vectorisation/vectorise` | ✅ | - | `{vector_data, vector_length, column_mapping}` |
| `POST` | `/optimization/aggregation/aggregate` | ✅ | - | `{aggregated_values, hierarchy_levels}` |
| `POST` | `/optimization/egr/create` | ✅ | `{egr_value}` | `{egr_value, batch_id}` |
| `GET` | `/optimization/egr/retrieve` | ✅ | - | `{egr_value, batch_id}` |
| `POST` | `/optimization/fixed-values/fix` | ✅ | `{fixed_values: [{row, col, value}]}` | `{fixed_values: [...]}` |
| `GET` | `/optimization/fixed-values/retrieve` | ✅ | - | `{fixed_values: [...]}` |
| `POST` | `/optimization/newton-raphson/optimize` | ✅ | - | `{optimized_vector, iterations, final_egr}` |
| `GET` | `/optimization/newton-raphson/retrieve` | ✅ | - | `{optimized_vector, iterations, final_egr}` |
| `POST` | `/optimization/data-time/set` | ✅ | `{start_time, end_time, period_type}` | `{start_time, end_time, period_type, batch_id}` |
| `GET` | `/optimization/data-time/get` | ✅ | - | `{start_time, end_time, period_type, batch_id}` |
| `POST` | `/optimization/growth-time/set` | ✅ | `{target_time}` | `{target_time, batch_id}` |
| `GET` | `/optimization/growth-time/get` | ✅ | - | `{target_time, batch_id}` |
| `POST` | `/optimization/forecast/calculate` | ✅ | `{alpha?, beta?, gamma?}` (optional) | `{forecasted_value, predicted_growth_rate, yearly_egr_estimation, ...}` |
| `GET` | `/optimization/forecast/get` | ✅ | - | `{forecasted_value, predicted_growth_rate, yearly_egr_estimation, ...}` |

---

## Database Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐
  │   users.db       │ ◀── Authentication
  │  • users         │
  │  • blacklisted   │
  │    _tokens       │
  └──────────────────┘

  ┌──────────────────┐
  │  batching.db     │ ◀── batch_id links all data
  │  • batches       │
  └────────┬─────────┘
           │
           │ batch_id (UUID) ─────────────────────────────────────┐
           │                                                       │
           ▼                                                       │
  ┌──────────────────┐      ┌──────────────────┐                  │
  │populated_data.db │──────│ vectorised_data.db│                  │
  │  • PopulatedData │      │  • VectorisedData │                  │
  │    (raw uploads) │      │    (NumPy vector) │                  │
  └──────────────────┘      └────────┬─────────┘                  │
                                     │                             │
           ┌─────────────────────────┼─────────────────────────┐   │
           │                         │                         │   │
           ▼                         ▼                         ▼   │
  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
  │   egr_data.db    │      │ fixed_values.db  │      │aggregated_data.db│
  │  • EGRData       │      │  • FixedValue    │      │  • AggregatedData│
  │  (target EGR)    │      │  (locked values) │      │  (hierarchy sum) │
  └────────┬─────────┘      └────────┬─────────┘      └────────┬─────────┘
           │                         │                         │
           └─────────────────────────┼─────────────────────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │newton_raphson_data.db│
                          │ • NewtonRaphsonData  │
                          │ (optimized results)  │
                          └──────────┬───────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
           ▼                         ▼                         ▼
  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
  │   data_time.db   │      │ growth_time.db  │      │forecast_results  │
  │  • DataTime      │      │  • GrowthTime   │      │    .db            │
  │  (time range)    │      │  (target time)  │      │  • ForecastResult │
  └──────────────────┘      └──────────────────┘      │  (forecasts)     │
                                                        └──────────────────┘
```

### Database Summary

| Database | Tables | Purpose |
|----------|--------|---------|
| `users.db` | users, blacklisted_tokens | User authentication & session management |
| `batching.db` | batches | Batch/workspace management |
| `populated_data.db` | PopulatedData | Raw uploaded data storage |
| `vectorised_data.db` | VectorisedData | Numerical vector representation |
| `aggregated_data.db` | AggregatedData | Hierarchical aggregation results |
| `egr_data.db` | EGRData | Target growth rate storage |
| `fixed_values.db` | FixedValue | User-defined fixed values |
| `newton_raphson_data.db` | NewtonRaphsonData | Optimization results |
| `data_time.db` | DataTime | Time range of populated data |
| `growth_time.db` | GrowthTime | Target time for growth rate prediction |
| `forecast_results.db` | ForecastResult | Holt-Winters forecast results |

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# App Configuration
APP_NAME=Inferalytics-Backend
DEBUG=True
```

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET_KEY` | Secret key for signing JWTs | Required |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Access token expiry (minutes) | `10080` (7 days) |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token expiry (days) | `30` |
| `APP_NAME` | Application name | `Inferalytics-Backend` |
| `DEBUG` | Debug mode | `True` |

---

## Quick Reference

### Workflow Steps

| Step | Endpoint | Description |
|------|----------|-------------|
| 1 | `/batching/create` + `/switch` | Create & activate workspace |
| 2 | `/optimization/data-population/upload-file` | Upload your data |
| 3 | `/optimization/vectorisation/vectorise` | Convert to numbers |
| 4 | `/optimization/egr/create` | Set growth target |
| 5 | `/optimization/fixed-values/fix` | Lock specific values |
| 6 | `/optimization/aggregation/aggregate` | Calculate totals |
| 7 | `/optimization/newton-raphson/optimize` | **Run optimization** |
| 8 | `/optimization/newton-raphson/retrieve` | Get results |
| 9 | `/optimization/data-time/set` | Set data time range (e.g., Q1_2024-Q4_2025) |
| 10 | `/optimization/growth-time/set` | Set target time (e.g., Q2_2026) |
| 11 | `/optimization/forecast/calculate` | **Calculate forecast** (Holt-Winters) |
| 12 | `/optimization/forecast/get` | Get forecast results |

### Token Configuration

| Token Type | Expiry | Purpose |
|------------|--------|---------|
| **Access Token** | 7 days (10080 min) | API authentication |
| **Refresh Token** | 30 days | Obtain new access token |

---

*Last Updated: 1 January 2026*
