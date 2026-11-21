/**
 * Error Mapping Utility for Yawmi
 * Translates raw Supabase, PostgreSQL, Auth, and RPC errors into clear, friendly Arabic & English messages.
 */

export function mapErrorMessage(error: any, lang: "ar" | "en" = "ar"): string {
  if (!error) return "";

  const rawMessage = typeof error === "string" ? error : (error.message || error.error_description || JSON.stringify(error));
  const lower = rawMessage.toLowerCase();

  // 1. Invalid credentials
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials") ||
    lower.includes("invalid email or password")
  ) {
    return lang === "ar"
      ? "بيانات الدخول غير صحيحة. يرجى التحقق من صحة البريد الإلكتروني وكلمة المرور."
      : "Invalid login credentials. Please check your email and password.";
  }

  // 2. Email already registered
  if (
    lower.includes("user already registered") ||
    lower.includes("email already in use") ||
    lower.includes("already registered") ||
    lower.includes("user_already_exists")
  ) {
    return lang === "ar"
      ? "هذا البريد الإلكتروني مسجل مسبقاً في النظام. يمكنك تسجيل الدخول مباشرة أو استعادة كلمة المرور."
      : "This email address is already registered. You can log in directly or reset your password.";
  }

  // 3. Password requirements
  if (
    lower.includes("password should be at least") ||
    lower.includes("weak_password") ||
    lower.includes("password is too short")
  ) {
    return lang === "ar"
      ? "كلمة المرور ضعيفة. يجب أن تتكون كلمة المرور من 6 خانات على الأقل."
      : "Password is too weak. It must be at least 6 characters long.";
  }

  // 4. Invalid or expired invite code (RPC: join_company_by_code)
  if (
    lower.includes("invalid company invite code") ||
    lower.includes("invite_code") ||
    lower.includes("company not found")
  ) {
    return lang === "ar"
      ? "كود دعوة المنشأة غير صحيح أو غير مفعل. يرجى مراجعة إدارة شركتك للتأكد من الكود."
      : "Invalid or inactive company invite code. Please check with your manager.";
  }

  // 5. Company limit reached (RPC: max_employees)
  if (
    lower.includes("max_employees") ||
    lower.includes("company employee limit reached") ||
    lower.includes("limit reached")
  ) {
    return lang === "ar"
      ? "عذراً، وصلت المنشأة إلى الحد الأقصى لعدد الموظفين المسموح به في باقتها الحالية."
      : "Sorry, this company has reached the maximum employee limit for its current subscription.";
  }

  // 6. Duplicate National ID or Phone (RPC: join_company_by_code)
  if (
    lower.includes("duplicate national_id") ||
    lower.includes("national_id already exists")
  ) {
    return lang === "ar"
      ? "رقم الهوية أو الإقامة مسجل مسبقاً في هذه المنشأة."
      : "This National ID / Iqama is already registered with this company.";
  }

  if (
    lower.includes("duplicate phone") ||
    lower.includes("phone number already exists")
  ) {
    return lang === "ar"
      ? "رقم الجوال مسجل مسبقاً في هذه المنشأة."
      : "This phone number is already registered with this company.";
  }

  // 7. User already belongs to company
  if (
    lower.includes("already belongs to an existing company") ||
    lower.includes("user already has a company")
  ) {
    return lang === "ar"
      ? "هذا الحساب مرتبط بالفعل بشركة مسجلة."
      : "This user account already belongs to an existing company.";
  }

  // 8. Company suspended
  if (
    lower.includes("company is suspended") ||
    lower.includes("subscription suspended")
  ) {
    return lang === "ar"
      ? "تم إيقاف اشتراك الشركة مؤقتاً. يرجى التواصل مع إدارة المنشأة."
      : "Company subscription is suspended. Please contact company management.";
  }

  // 9. Account suspended or pending
  if (lower.includes("account suspended")) {
    return lang === "ar"
      ? "تم تجميد حسابك، يرجى التواصل مع مسؤول النظام."
      : "Your account is suspended. Please contact your system administrator.";
  }

  if (lower.includes("pending approval") || lower.includes("account pending")) {
    return lang === "ar"
      ? "طلب انضمامك قيد المراجعة والاعتماد من قبل إدارة المنشأة."
      : "Your join request is pending approval by company management.";
  }

  // 10. Email unconfirmed
  if (
    lower.includes("email not confirmed") ||
    lower.includes("confirm your email")
  ) {
    return lang === "ar"
      ? "يرجى تأكيد بريدك الإلكتروني أولاً عبر الرابط المرسل إلى صندوق الوارد."
      : "Please confirm your email address first via the link sent to your inbox.";
  }

  // 11. Rate limit / Too many requests
  if (
    lower.includes("too many requests") ||
    lower.includes("rate limit") ||
    lower.includes("over_email_send_rate_limit")
  ) {
    return lang === "ar"
      ? "تم إرسال عدد كبير من الطلبات خلال وقت قصير. يرجى الانتظار دقيقة والمحاولة مجدداً."
      : "Too many requests. Please wait a minute and try again.";
  }

  // 12. Network / connection errors
  if (
    lower.includes("network error") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkrequestfailed")
  ) {
    return lang === "ar"
      ? "تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت لديك والمحاولة مجدداً."
      : "Network connection error. Please check your internet connection and try again.";
  }

  // Fallback to raw message if already in Arabic or no specific rule matched
  return rawMessage;
}
