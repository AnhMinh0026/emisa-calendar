TÀI LIỆU ĐẶC TẢ YÊU CẦU HỆ THỐNG (SRS)
Dự án: Hệ sinh thái Quản lý Lịch học (App & Web)
Người quản trị dự án: Nguyễn Anh Minh
Phiên bản: 2.1 (Cập nhật cấu trúc Admin, Zalo Bot, IDE & UI Design)
Ngày cập nhật: Tháng 9/2026

1. Tổng quan hệ thống (System Overview)
Hệ thống là giải pháp chuyển đổi số toàn diện thay thế bảng tính Excel, phục vụ hai mục đích chính: giúp các quản trị viên (Admin) vận hành lịch học không bị xung đột dữ liệu, và cung cấp một kênh tra cứu lịch trực quan, thời gian thực cho khách hàng.
Mobile App (Internal): Ứng dụng nghiệp vụ dành riêng cho các Admin thao tác nhanh gọn.
Web Platform: Gồm trang Public cho khách vãng lai xem lịch và trang Admin ẩn để xử lý công việc linh hoạt trên máy tính.

2. Kiến trúc & Ngăn xếp Công nghệ (Tech Stack)
Giải pháp lựa chọn hệ sinh thái React để tối ưu việc chia sẻ logic và component giữa Web và Mobile, kết hợp với các dịch vụ đám mây hiện đại:
Frontend - Mobile: React Native.
Frontend - Web: React, ưu tiên sử dụng thư viện Ant Design (antd) cho giao diện, quản lý bản build và preview deployments trên Vercel.
Backend API: Node.js, thiết lập server trên Render để xử lý nghiệp vụ tập trung.
Cơ sở dữ liệu: MongoDB Atlas (Lưu trữ chung cho cả App và Web, quản lý quyền truy cập mạng nghiêm ngặt).
Real-time & Thông báo: Socket.io (In-app) và tích hợp Zalo Bot (Out-of-app).
Công cụ phát triển: Viết code qua nền tảng Google Antigravity IDE, version control trên GitHub, thiết kế UI/UX đồng bộ trên Figma.
Giám sát hệ thống: Tích hợp Sentry để tracking lỗi ứng dụng/API và dùng UptimeRobot để theo dõi uptime của Backend.

3. Phân quyền Người dùng (Roles & Permissions)
Khách hàng (Public): Truy cập web qua link được chia sẻ. Quyền truy cập "Chỉ Đọc" (Read-only). Không có tính năng thao tác.
Admin (Quản trị viên): Hệ thống không giới hạn số lượng Admin. Số lượng và quyền hạn phụ thuộc vào việc tạo tài khoản và phân quyền trên hệ thống. Đăng nhập trên cả React Native App và Web Admin. Có toàn quyền (CRUD) đối với Khóa học, Lớp học và kiểm soát sĩ số.

4. Luồng Nghiệp vụ Cốt lõi (Core Business Logic)
4.1. Khởi tạo & Chống trùng lịch (Validation)
Hệ thống tự động query database để chặn các yêu cầu tạo mới khóa học nếu ngày học và khung giờ đã bị chiếm dụng bởi một mã lớp khác.
4.2. Xử lý Xung đột Đồng thời (Concurrency)
Triển khai toán tử $inc của MongoDB kết hợp điều kiện currentBooked < maxCapacity. Khi nhiều Admin cùng nhấn nút chốt slot trên App hoặc Web, Database sẽ khóa bản ghi và chỉ cho phép giao dịch hợp lệ đầu tiên thành công.
4.3. Đồng bộ & Hệ thống Thông báo (Notification System)
In-app Notification (Socket.io): Khi có sự thay đổi slot, tất cả client (App và Web) đang mở sẽ nhận tín hiệu để đổi màu trạng thái và hiển thị Toast Message: "Admin A vừa chốt 1 slot K02".
Out-of-app Notification (Zalo Bot): Bắn cảnh báo tự động vào nhóm chat Zalo nội bộ khi một Admin cập nhật trạng thái lớp học, giúp các thành viên còn lại nắm bắt tức thời thông tin kể cả khi tắt máy.

5. Thiết kế Cơ sở dữ liệu (Database Schema)
Collection
Mô tả chức năng
Các trường dữ liệu chính
 
Admins
Lưu danh sách tài khoản Admin (số lượng linh hoạt)
_id, username, pinCode/password, name, roleLevel
CourseCampaigns
Lưu thông tin nhóm/tháng
_id, title, description, month
ClassSessions
Chi tiết từng Lớp học
_id, campaignId, classCode, studyDates, timeSlot, maxCapacity, currentBooked, status
AuditLogs
Theo dõi lịch sử hệ thống
_id, adminId, actionType, targetClass, timestamp


6. Tối ưu Giao diện (UI/UX) & Design System
Ngôn ngữ thiết kế (Design Language): Áp dụng nguyên tắc Material Design (MD) cho toàn bộ nền tảng để tạo sự đồng điệu tuyệt đối về màu sắc, hiệu ứng nổi (shadows) và điều hướng giữa bản Web và Mobile.
Giao diện Web (Admin & Public): Tích hợp framework Ant Design (antd) vào React để tiết kiệm thời gian code và đảm bảo form/table quản trị mang lại trải nghiệm chuyên nghiệp, mượt mà.
Mobile-First Design: Tái sử dụng các tư duy Component Card View từ Mobile lên giao diện Web Public, giúp khách vãng lai dùng điện thoại duyệt lịch học trơn tru.
Tiện ích chia sẻ: Bổ sung nút "Copy Link" trên giao diện Admin, cho phép sao chép nhanh trạng thái lịch học để dán trực tiếp vào Zalo/Messenger cho khách hàng.
