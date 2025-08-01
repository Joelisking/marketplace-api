# Admin Vendor Application Management Guide

This guide provides comprehensive instructions for implementing the admin interface to view and approve vendor applications in the marketplace.

## Overview

After a vendor submits an application, admins need to:

1. View a list of all vendor applications
2. Review individual applications in detail
3. Approve or reject applications with notes
4. Request additional documents if needed
5. Monitor application status and processing times

## Backend Endpoints

### 1. Get All Vendor Applications

**Endpoint:** `GET /vendor-onboarding/admin/applications`

**Query Parameters:**

- `status` (optional): Filter by status (`PENDING`, `UNDER_REVIEW`, `DOCUMENTS_REQUESTED`, `APPROVED`, `REJECTED`, `SUSPENDED`)
- `businessType` (optional): Filter by business type
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search by business name, user email, or Ghana Card number

**Response:**

```json
{
  "message": "Vendor applications retrieved successfully",
  "applications": [
    {
      "id": "app_123",
      "userId": "user_456",
      "businessName": "Sample Business",
      "businessType": "SOLE_PROPRIETORSHIP",
      "businessDescription": "Business description...",
      "businessAddress": "123 Main St, Accra",
      "businessPhone": "+233201234567",
      "taxIdentification": "GHA123456789",
      "ghanaCardNumber": "GHA-123456789-1",
      "bankName": "Ghana Commercial Bank",
      "bankAccountNumber": "1234567890",
      "bankAccountName": "Sample Business Account",
      "bankCode": "GCB",
      "expectedMonthlySales": "TEN_TO_FIFTY_THOUSAND",
      "productCategories": ["Electronics", "Fashion"],
      "socialMediaLinks": {
        "facebook": "https://facebook.com/sample",
        "instagram": "https://instagram.com/sample"
      },
      "status": "PENDING",
      "reviewNotes": null,
      "reviewedBy": null,
      "reviewedAt": null,
      "approvedAt": null,
      "rejectedAt": null,
      "rejectionReason": null,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "user": {
        "id": "user_456",
        "email": "vendor@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+233201234567"
      },
      "businessDocuments": [
        {
          "id": "doc_789",
          "documentType": "GHANA_CARD",
          "fileName": "ghana_card_front.jpg",
          "fileUrl": "https://cdn.example.com/documents/ghana_card_front.jpg",
          "fileSize": 1024000,
          "mimeType": "image/jpeg",
          "isVerified": false,
          "verificationNotes": null,
          "uploadedAt": "2024-01-15T10:35:00Z",
          "verifiedAt": null,
          "side": "FRONT"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### 2. Get Single Vendor Application

**Endpoint:** `GET /vendor-onboarding/admin/applications/{applicationId}`

**Response:** Same structure as individual application object above

### 3. Review/Approve/Reject Application

**Endpoint:** `POST /vendor-onboarding/admin/applications/{applicationId}/review`

**Request Body:**

```json
{
  "status": "APPROVED", // or "REJECTED", "DOCUMENTS_REQUESTED", "UNDER_REVIEW"
  "reviewNotes": "Application looks good, all documents verified",
  "rejectionReason": "Incomplete business documentation" // Required if status is "REJECTED"
}
```

**Response:**

```json
{
  "message": "Vendor application reviewed successfully",
  "application": {
    // Updated application object
  }
}
```

### 4. Update Application Status

**Endpoint:** `PUT /vendor-onboarding/admin/applications/{applicationId}/status`

**Request Body:**

```json
{
  "status": "UNDER_REVIEW",
  "notes": "Application moved to review phase",
  "rejectionReason": "Additional documents required" // Optional
}
```

**Response:**

```json
{
  "message": "Vendor application status updated successfully",
  "application": {
    // Updated application object
  }
}
```

## Frontend Implementation

### 1. Admin Dashboard Layout

Create a main admin dashboard with navigation to vendor applications:

```typescript
// components/AdminDashboard.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  return (
    <div className="admin-dashboard">
      <nav className="admin-nav">
        <Link to="/admin/vendor-applications" className="nav-item">
          <i className="fas fa-store"></i>
          Vendor Applications
        </Link>
        <Link to="/admin/dashboard" className="nav-item">
          <i className="fas fa-chart-bar"></i>
          Analytics
        </Link>
        {/* Other admin sections */}
      </nav>

      <div className="dashboard-content">
        {/* Dashboard widgets */}
      </div>
    </div>
  );
};
```

### 2. Vendor Applications List Page

```typescript
// pages/VendorApplicationsList.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { VendorApplicationCard } from '../components/VendorApplicationCard';
import { ApplicationFilters } from '../components/ApplicationFilters';
import { Pagination } from '../components/Pagination';

interface VendorApplication {
  id: string;
  businessName: string;
  businessType: string;
  status: string;
  createdAt: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
  businessDocuments: Array<{
    documentType: string;
    isVerified: boolean;
  }>;
}

const VendorApplicationsList: React.FC = () => {
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    businessType: '',
    search: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    page: 1,
    limit: 20
  });

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });

      const response = await fetch(`/api/vendor-onboarding/admin/applications?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [filters]);

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  if (loading) {
    return <div className="loading-spinner">Loading applications...</div>;
  }

  return (
    <div className="vendor-applications-page">
      <div className="page-header">
        <h1>Vendor Applications</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={fetchApplications}>
            <i className="fas fa-sync"></i> Refresh
          </button>
        </div>
      </div>

      <ApplicationFilters
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      <div className="applications-grid">
        {applications.map(application => (
          <VendorApplicationCard
            key={application.id}
            application={application}
            onStatusUpdate={fetchApplications}
          />
        ))}
      </div>

      {applications.length === 0 && (
        <div className="empty-state">
          <i className="fas fa-inbox"></i>
          <h3>No applications found</h3>
          <p>No vendor applications match your current filters.</p>
        </div>
      )}

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
};
```

### 3. Application Filters Component

```typescript
// components/ApplicationFilters.tsx
import React from 'react';

interface FiltersProps {
  filters: {
    status: string;
    businessType: string;
    search: string;
  };
  onFilterChange: (filters: Partial<FiltersProps['filters']>) => void;
}

export const ApplicationFilters: React.FC<FiltersProps> = ({ filters, onFilterChange }) => {
  return (
    <div className="application-filters">
      <div className="filters-row">
        <div className="filter-group">
          <label htmlFor="status-filter">Status</label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="DOCUMENTS_REQUESTED">Documents Requested</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="business-type-filter">Business Type</label>
          <select
            id="business-type-filter"
            value={filters.businessType}
            onChange={(e) => onFilterChange({ businessType: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
            <option value="PARTNERSHIP">Partnership</option>
            <option value="LIMITED_LIABILITY_COMPANY">Limited Liability Company</option>
            <option value="CORPORATION">Corporation</option>
            <option value="COOPERATIVE">Cooperative</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="search-filter">Search</label>
          <input
            id="search-filter"
            type="text"
            placeholder="Search by business name, email, or Ghana Card..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
};
```

### 4. Admin Dashboard Component

```typescript
// components/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  averageProcessingTime: number;
  applicationsByStatus: Array<{ status: string; count: number }>;
  applicationsByBusinessType: Array<{ businessType: string; count: number }>;
  recentApplications: any[];
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vendor-onboarding/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.dashboard);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading) {
    return <div className="loading-spinner">Loading dashboard...</div>;
  }

  if (!stats) {
    return <div className="error-message">Failed to load dashboard</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Vendor Onboarding Dashboard</h1>
        <button className="btn btn-secondary" onClick={fetchDashboardStats}>
          <i className="fas fa-sync"></i> Refresh
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-file-alt"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalApplications}</h3>
            <p>Total Applications</p>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon">
            <i className="fas fa-clock"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.pendingApplications}</h3>
            <p>Pending Review</p>
          </div>
        </div>

        <div className="stat-card approved">
          <div className="stat-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.approvedApplications}</h3>
            <p>Approved</p>
          </div>
        </div>

        <div className="stat-card rejected">
          <div className="stat-icon">
            <i className="fas fa-times-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.rejectedApplications}</h3>
            <p>Rejected</p>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="section">
          <h2>Processing Time</h2>
          <div className="processing-time">
            <span className="time-value">{stats.averageProcessingTime}</span>
            <span className="time-unit">days average</span>
          </div>
        </div>

        <div className="section">
          <h2>Applications by Status</h2>
          <div className="status-chart">
            {stats.applicationsByStatus.map(item => (
              <div key={item.status} className="status-item">
                <span className="status-label">{item.status.replace(/_/g, ' ')}</span>
                <span className="status-count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h2>Applications by Business Type</h2>
          <div className="business-type-chart">
            {stats.applicationsByBusinessType.map(item => (
              <div key={item.businessType} className="business-type-item">
                <span className="type-label">{item.businessType.replace(/_/g, ' ')}</span>
                <span className="type-count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="recent-applications">
        <div className="section-header">
          <h2>Recent Applications</h2>
          <Link to="/admin/vendor-applications" className="btn btn-primary">
            View All Applications
          </Link>
        </div>

        <div className="applications-list">
          {stats.recentApplications.map(application => (
            <div key={application.id} className="recent-application-item">
              <div className="application-info">
                <h4>{application.businessName}</h4>
                <p>{application.user.email}</p>
                <span className={`status-badge status-${application.status.toLowerCase()}`}>
                  {application.status.replace(/_/g, ' ')}
                </span>
              </div>
              <Link
                to={`/admin/vendor-applications/${application.id}`}
                className="btn btn-sm btn-secondary"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
```

### 5. Application Card Component

```typescript
// components/VendorApplicationCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';

interface VendorApplicationCardProps {
  application: {
    id: string;
    businessName: string;
    businessType: string;
    status: string;
    createdAt: string;
    user: {
      email: string;
      firstName: string;
      lastName: string;
    };
    businessDocuments: Array<{
      documentType: string;
      isVerified: boolean;
    }>;
  };
  onStatusUpdate: () => void;
}

export const VendorApplicationCard: React.FC<VendorApplicationCardProps> = ({
  application,
  onStatusUpdate
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'orange';
      case 'UNDER_REVIEW': return 'blue';
      case 'DOCUMENTS_REQUESTED': return 'yellow';
      case 'APPROVED': return 'green';
      case 'REJECTED': return 'red';
      case 'SUSPENDED': return 'gray';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return 'fas fa-clock';
      case 'UNDER_REVIEW': return 'fas fa-search';
      case 'DOCUMENTS_REQUESTED': return 'fas fa-file-alt';
      case 'APPROVED': return 'fas fa-check-circle';
      case 'REJECTED': return 'fas fa-times-circle';
      case 'SUSPENDED': return 'fas fa-pause-circle';
      default: return 'fas fa-question-circle';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const hasGhanaCard = application.businessDocuments.some(
    doc => doc.documentType === 'GHANA_CARD'
  );

  return (
    <div className="application-card">
      <div className="card-header">
        <div className="business-info">
          <h3 className="business-name">{application.businessName}</h3>
          <p className="business-type">{application.businessType.replace(/_/g, ' ')}</p>
        </div>
        <div className={`status-badge status-${getStatusColor(application.status)}`}>
          <i className={getStatusIcon(application.status)}></i>
          {application.status.replace(/_/g, ' ')}
        </div>
      </div>

      <div className="card-body">
        <div className="user-info">
          <p><strong>Applicant:</strong> {application.user.firstName} {application.user.lastName}</p>
          <p><strong>Email:</strong> {application.user.email}</p>
          <p><strong>Applied:</strong> {formatDate(application.createdAt)}</p>
        </div>

        <div className="document-status">
          <p><strong>Documents:</strong></p>
          <div className="document-indicators">
            <span className={`doc-indicator ${hasGhanaCard ? 'verified' : 'missing'}`}>
              <i className={`fas ${hasGhanaCard ? 'fa-check' : 'fa-times'}`}></i>
              Ghana Card
            </span>
          </div>
        </div>
      </div>

      <div className="card-actions">
        <Link
          to={`/admin/vendor-applications/${application.id}`}
          className="btn btn-primary"
        >
          <i className="fas fa-eye"></i> View Details
        </Link>

        {application.status === 'PENDING' && (
          <button
            className="btn btn-success"
            onClick={() => handleQuickApprove(application.id)}
          >
            <i className="fas fa-check"></i> Quick Approve
          </button>
        )}
      </div>
    </div>
  );
};
```

### 5. Application Detail Page

```typescript
// pages/VendorApplicationDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApplicationReviewForm } from '../components/ApplicationReviewForm';
import { DocumentViewer } from '../components/DocumentViewer';

interface VendorApplication {
  id: string;
  businessName: string;
  businessType: string;
  businessDescription: string;
  businessAddress: string;
  businessPhone: string;
  taxIdentification: string;
  ghanaCardNumber: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankCode: string;
  expectedMonthlySales: string;
  productCategories: string[];
  socialMediaLinks: any;
  status: string;
  reviewNotes: string;
  reviewedBy: string;
  reviewedAt: string;
  approvedAt: string;
  rejectedAt: string;
  rejectionReason: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  businessDocuments: Array<{
    id: string;
    documentType: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    isVerified: boolean;
    verificationNotes: string;
    uploadedAt: string;
    verifiedAt: string;
    side: string;
  }>;
}

const VendorApplicationDetail: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<VendorApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vendor-onboarding/admin/applications/${applicationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApplication(data.application);
      } else {
        navigate('/admin/vendor-applications');
      }
    } catch (error) {
      console.error('Failed to fetch application:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) {
      fetchApplication();
    }
  }, [applicationId]);

  const handleReviewSubmit = async (reviewData: any) => {
    try {
      const response = await fetch(`/api/vendor-onboarding/admin/applications/${applicationId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(reviewData)
      });

      if (response.ok) {
        await fetchApplication();
        setShowReviewForm(false);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading application...</div>;
  }

  if (!application) {
    return <div className="error-message">Application not found</div>;
  }

  return (
    <div className="application-detail-page">
      <div className="page-header">
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/admin/vendor-applications')}
        >
          <i className="fas fa-arrow-left"></i> Back to Applications
        </button>
        <h1>{application.businessName}</h1>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => setShowReviewForm(true)}
          >
            <i className="fas fa-edit"></i> Review Application
          </button>
        </div>
      </div>

      <div className="application-content">
        <div className="application-sections">
          {/* Business Information */}
          <section className="info-section">
            <h2>Business Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Business Name:</label>
                <span>{application.businessName}</span>
              </div>
              <div className="info-item">
                <label>Business Type:</label>
                <span>{application.businessType.replace(/_/g, ' ')}</span>
              </div>
              <div className="info-item">
                <label>Description:</label>
                <span>{application.businessDescription}</span>
              </div>
              <div className="info-item">
                <label>Address:</label>
                <span>{application.businessAddress}</span>
              </div>
              <div className="info-item">
                <label>Phone:</label>
                <span>{application.businessPhone}</span>
              </div>
              <div className="info-item">
                <label>Tax ID:</label>
                <span>{application.taxIdentification || 'Not provided'}</span>
              </div>
            </div>
          </section>

          {/* Applicant Information */}
          <section className="info-section">
            <h2>Applicant Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Name:</label>
                <span>{application.user.firstName} {application.user.lastName}</span>
              </div>
              <div className="info-item">
                <label>Email:</label>
                <span>{application.user.email}</span>
              </div>
              <div className="info-item">
                <label>Phone:</label>
                <span>{application.user.phone}</span>
              </div>
              <div className="info-item">
                <label>Ghana Card Number:</label>
                <span>{application.ghanaCardNumber}</span>
              </div>
            </div>
          </section>

          {/* Banking Information */}
          <section className="info-section">
            <h2>Banking Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Bank Name:</label>
                <span>{application.bankName}</span>
              </div>
              <div className="info-item">
                <label>Account Number:</label>
                <span>{application.bankAccountNumber}</span>
              </div>
              <div className="info-item">
                <label>Account Name:</label>
                <span>{application.bankAccountName}</span>
              </div>
              <div className="info-item">
                <label>Bank Code:</label>
                <span>{application.bankCode}</span>
              </div>
            </div>
          </section>

          {/* Documents */}
          <section className="info-section">
            <h2>Business Documents</h2>
            <DocumentViewer documents={application.businessDocuments} />
          </section>

          {/* Review History */}
          {application.reviewedAt && (
            <section className="info-section">
              <h2>Review History</h2>
              <div className="review-history">
                <div className="review-item">
                  <label>Status:</label>
                  <span className={`status-badge status-${application.status.toLowerCase()}`}>
                    {application.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="review-item">
                  <label>Reviewed At:</label>
                  <span>{new Date(application.reviewedAt).toLocaleString('en-GH')}</span>
                </div>
                {application.reviewNotes && (
                  <div className="review-item">
                    <label>Review Notes:</label>
                    <span>{application.reviewNotes}</span>
                  </div>
                )}
                {application.rejectionReason && (
                  <div className="review-item">
                    <label>Rejection Reason:</label>
                    <span>{application.rejectionReason}</span>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {showReviewForm && (
        <ApplicationReviewForm
          application={application}
          onSubmit={handleReviewSubmit}
          onCancel={() => setShowReviewForm(false)}
        />
      )}
    </div>
  );
};
```

### 6. Application Review Form

```typescript
// components/ApplicationReviewForm.tsx
import React, { useState } from 'react';

interface ApplicationReviewFormProps {
  application: any;
  onSubmit: (reviewData: any) => void;
  onCancel: () => void;
}

export const ApplicationReviewForm: React.FC<ApplicationReviewFormProps> = ({
  application,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    status: 'APPROVED',
    reviewNotes: '',
    rejectionReason: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const reviewData = {
      status: formData.status,
      reviewNotes: formData.reviewNotes,
      ...(formData.status === 'REJECTED' && { rejectionReason: formData.rejectionReason })
    };

    onSubmit(reviewData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Review Application</h2>
          <button className="close-btn" onClick={onCancel}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="review-form">
          <div className="form-group">
            <label htmlFor="status">Decision</label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              required
            >
              <option value="APPROVED">Approve</option>
              <option value="REJECTED">Reject</option>
              <option value="DOCUMENTS_REQUESTED">Request Additional Documents</option>
              <option value="UNDER_REVIEW">Mark for Review</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="reviewNotes">Review Notes</label>
            <textarea
              id="reviewNotes"
              value={formData.reviewNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, reviewNotes: e.target.value }))}
              placeholder="Add your review notes..."
              rows={4}
              required
            />
          </div>

          {formData.status === 'REJECTED' && (
            <div className="form-group">
              <label htmlFor="rejectionReason">Rejection Reason</label>
              <textarea
                id="rejectionReason"
                value={formData.rejectionReason}
                onChange={(e) => setFormData(prev => ({ ...prev, rejectionReason: e.target.value }))}
                placeholder="Provide specific reason for rejection..."
                rows={3}
                required
              />
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Submit Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

### 7. Document Viewer Component

```typescript
// components/DocumentViewer.tsx
import React, { useState } from 'react';

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  isVerified: boolean;
  verificationNotes: string;
  uploadedAt: string;
  verifiedAt: string;
  side: string;
}

interface DocumentViewerProps {
  documents: Document[];
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ documents }) => {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentIcon = (documentType: string) => {
    switch (documentType) {
      case 'GHANA_CARD': return 'fas fa-id-card';
      default: return 'fas fa-file';
    }
  };

  return (
    <div className="document-viewer">
      <div className="documents-grid">
        {documents.map(document => (
          <div key={document.id} className="document-card">
            <div className="document-header">
              <i className={getDocumentIcon(document.documentType)}></i>
              <span className="document-type">
                {document.documentType.replace(/_/g, ' ')}
                {document.side && ` (${document.side})`}
              </span>
              <span className={`verification-status ${document.isVerified ? 'verified' : 'unverified'}`}>
                <i className={`fas ${document.isVerified ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                {document.isVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>

            <div className="document-info">
              <p><strong>File:</strong> {document.fileName}</p>
              <p><strong>Size:</strong> {formatFileSize(document.fileSize)}</p>
              <p><strong>Uploaded:</strong> {new Date(document.uploadedAt).toLocaleDateString('en-GH')}</p>
            </div>

            <div className="document-actions">
              <button
                className="btn btn-primary"
                onClick={() => setSelectedDocument(document)}
              >
                <i className="fas fa-eye"></i> View
              </button>
              <a
                href={document.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                <i className="fas fa-download"></i> Download
              </a>
            </div>
          </div>
        ))}
      </div>

      {selectedDocument && (
        <div className="modal-overlay" onClick={() => setSelectedDocument(null)}>
          <div className="modal-content document-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedDocument.documentType.replace(/_/g, ' ')}</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedDocument(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <img
                src={selectedDocument.fileUrl}
                alt={selectedDocument.fileName}
                className="document-image"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

## CSS Styling

Create a comprehensive CSS file for the admin interface:

```css
/* admin-vendor-applications.css */

/* Dashboard Styles */
.admin-dashboard {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.dashboard-header h1 {
  margin: 0;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.stat-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card.pending {
  border-left: 4px solid #ffc107;
}

.stat-card.approved {
  border-left: 4px solid #28a745;
}

.stat-card.rejected {
  border-left: 4px solid #dc3545;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
}

.stat-card .stat-icon {
  background: #007bff;
}

.stat-card.pending .stat-icon {
  background: #ffc107;
}

.stat-card.approved .stat-icon {
  background: #28a745;
}

.stat-card.rejected .stat-icon {
  background: #dc3545;
}

.stat-content h3 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #333;
}

.stat-content p {
  margin: 0.25rem 0 0 0;
  color: #666;
  font-size: 0.9rem;
}

.dashboard-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
}

.section h2 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.2rem;
}

.processing-time {
  text-align: center;
  padding: 2rem 0;
}

.time-value {
  display: block;
  font-size: 3rem;
  font-weight: 700;
  color: #007bff;
}

.time-unit {
  color: #666;
  font-size: 0.9rem;
}

.status-chart,
.business-type-chart {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.status-item,
.business-type-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.status-label,
.type-label {
  font-weight: 600;
  color: #333;
}

.status-count,
.type-count {
  background: #007bff;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.recent-applications {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
  color: #333;
}

.applications-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recent-application-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #f8f9fa;
}

.application-info h4 {
  margin: 0 0 0.25rem 0;
  color: #333;
}

.application-info p {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
}

/* Page Layout */
.vendor-applications-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.page-header h1 {
  margin: 0;
  color: #333;
}

/* Filters */
.application-filters {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.filters-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
}

.filter-group label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #555;
}

.filter-group select,
.filter-group input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

/* Application Cards */
.applications-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.application-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
}

.application-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.business-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  color: #333;
}

.business-type {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
}
.status-under_review {
  background: #cce5ff;
  color: #004085;
}
.status-documents_requested {
  background: #fff3cd;
  color: #856404;
}
.status-approved {
  background: #d4edda;
  color: #155724;
}
.status-rejected {
  background: #f8d7da;
  color: #721c24;
}
.status-suspended {
  background: #e2e3e5;
  color: #383d41;
}

.card-body {
  margin-bottom: 1.5rem;
}

.user-info p,
.document-status p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.document-indicators {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.doc-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
}

.doc-indicator.verified {
  background: #d4edda;
  color: #155724;
}

.doc-indicator.missing {
  background: #f8d7da;
  color: #721c24;
}

.card-actions {
  display: flex;
  gap: 1rem;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #1e7e34;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

/* Application Detail Page */
.application-detail-page {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.application-content {
  margin-top: 2rem;
}

.application-sections {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.info-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
}

.info-section h2 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.3rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-item label {
  font-weight: 600;
  color: #555;
  margin-bottom: 0.25rem;
}

.info-item span {
  color: #333;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.close-btn:hover {
  color: #333;
}

/* Forms */
.review-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #555;
}

.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

/* Document Viewer */
.document-viewer {
  margin-top: 1rem;
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.document-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  background: #f8f9fa;
}

.document-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.document-type {
  font-weight: 600;
  color: #333;
}

.verification-status {
  margin-left: auto;
  font-size: 0.8rem;
}

.verification-status.verified {
  color: #28a745;
}

.verification-status.unverified {
  color: #dc3545;
}

.document-info p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
}

.document-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.document-modal .modal-content {
  max-width: 800px;
}

.document-image {
  width: 100%;
  height: auto;
  border-radius: 4px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .vendor-applications-page,
  .application-detail-page {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .filters-row {
    grid-template-columns: 1fr;
  }

  .applications-grid {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .card-actions {
    flex-direction: column;
  }

  .form-actions {
    flex-direction: column;
  }
}
```

## Implementation Checklist

### Backend (Already Implemented)

- [x] Get all vendor applications with filtering and pagination
- [x] Get single vendor application by ID
- [x] Review/approve/reject applications
- [x] Update application status
- [x] Document verification endpoints
- [x] Admin authentication middleware

### Frontend

- [ ] Create admin dashboard layout
- [ ] Implement vendor applications list page
- [ ] Create application filters component
- [ ] Build application card component
- [ ] Implement application detail page
- [ ] Create application review form
- [ ] Build document viewer component
- [ ] Add pagination component
- [ ] Implement responsive design
- [ ] Add loading states and error handling
- [ ] Create notification system for status updates

### Features to Add

- [ ] Bulk actions (approve/reject multiple applications)
- [ ] Export applications to CSV/Excel
- [ ] Application statistics dashboard
- [ ] Email notifications to vendors
- [ ] Document verification workflow
- [ ] Application timeline/history
- [ ] Search and advanced filtering
- [ ] Application comments/notes system

## Security Considerations

1. **Authentication**: All admin endpoints require valid admin tokens
2. **Authorization**: Only users with admin or super admin roles can access
3. **Input Validation**: All inputs are validated using Zod schemas
4. **Rate Limiting**: Implement rate limiting on admin endpoints
5. **Audit Logging**: Log all admin actions for accountability
6. **Data Sanitization**: Sanitize all user inputs to prevent XSS

## Testing

Create comprehensive tests for:

- Admin authentication and authorization
- Application listing and filtering
- Application review workflow
- Document verification
- Error handling and edge cases
- API response validation

This guide provides a complete foundation for implementing the admin vendor application management system. The existing backend endpoints are already implemented and ready to use, while the frontend components provide a modern, responsive interface for efficient application management.
