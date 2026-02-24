import type {
  ApiResponse,
  AuthResult,
  DashboardData,
  ReferralTreeData,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Request failed (${res.status})`);
    }

    return res.json();
  }

  // Auth
  async login(email: string, password: string): Promise<ApiResponse<AuthResult>> {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(
    name: string,
    email: string,
    password: string,
    referralCode?: string
  ): Promise<ApiResponse<AuthResult>> {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, referralCode }),
    });
  }

  // Dashboard
  async getDashboard(): Promise<ApiResponse<DashboardData>> {
    return this.request("/dashboard");
  }

  // Referral tree
  async getReferralTree(maxLevel = 3): Promise<ApiResponse<ReferralTreeData>> {
    return this.request(`/referrals/tree?maxLevel=${maxLevel}`);
  }

  // Create investment
  async createInvestment(
    amount: number,
    plan: string
  ): Promise<ApiResponse<{ investment: any }>> {
    return this.request("/investments", {
      method: "POST",
      body: JSON.stringify({ amount, plan }),
    });
  }
}

const api = new ApiClient();
export default api;
