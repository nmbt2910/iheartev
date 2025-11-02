# iHeartEV - Second-hand EV & Battery Trading Platform

Một nền tảng thương mại điện tử cho phép người dùng mua bán xe điện và pin đã qua sử dụng, được tích hợp với AI để đánh giá và đề xuất giá cả.

## 📋 Mục lục

- [Tính năng](#tính-năng)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cài đặt](#cài-đặt)
- [Cấu hình](#cấu-hình)
- [Chạy ứng dụng](#chạy-ứng-dụng)
- [API Documentation](#api-documentation)

## ✨ Tính năng

### Backend (Spring Boot)

#### Xác thực và Phân quyền
- ✅ Đăng ký và đăng nhập người dùng
- ✅ JWT-based authentication
- ✅ Phân quyền Admin/Member
- ✅ Validate token và tự động logout khi hết hạn

#### Quản lý Tin đăng (Listings)
- ✅ Tạo, sửa, xóa tin đăng
- ✅ Tìm kiếm và lọc tin đăng (theo hãng, năm, giá, dung lượng pin)
- ✅ Trạng thái tin đăng (ACTIVE, DRAFT, SOLD)
- ✅ Hỗ trợ cả EV và Battery

#### AI Integration
- ✅ Đánh giá AI tổng quát về xe điện (sử dụng Gemini API)
- ✅ Đề xuất giá cả bằng AI
- ✅ Fallback tự động giữa nhiều mô hình Gemini
- ✅ Format và hiển thị text đẹp mắt

#### Tương tác Xã hội
- ✅ Yêu thích (Favorites) - đồng bộ real-time
- ✅ Đánh giá và nhận xét
- ✅ Kiểm tra trạng thái yêu thích

#### Giao dịch & Thanh toán
- ✅ Tạo đơn hàng (Buy Now)
- ✅ Quản lý đơn hàng với đầy đủ lifecycle (PENDING, PAID, CANCELLED, CLOSED)
- ✅ Chi tiết đơn hàng với AI insights về người bán
- ✅ Hủy đơn hàng (cả người mua và người bán có thể hủy)
- ✅ Xác nhận thanh toán (người mua xác nhận đã thanh toán)
- ✅ Xác nhận nhận tiền (người bán xác nhận đã nhận tiền)
- ✅ **Phương thức thanh toán VietQR**: Chuyển khoản qua VietQR với thông tin ngân hàng đầy đủ
- ✅ **Thanh toán tiền mặt**: Thanh toán khi nhận hàng
- ✅ Danh sách ngân hàng Việt Nam (tích hợp API)

#### Quản lý Hồ sơ Người bán
- ✅ Xem hồ sơ người bán (từ trang chi tiết tin đăng)
- ✅ Xem đánh giá và rating của người bán
- ✅ Xem danh sách tin đăng hiện tại của người bán
- ✅ Xem lịch sử đã bán của người bán
- ✅ Phân tích AI về uy tín người bán

#### Đánh giá & Nhận xét
- ✅ Đánh giá người bán sau khi đơn hàng đóng
- ✅ Đánh giá người mua bởi người bán
- ✅ Chỉnh sửa đánh giá (tối đa 2 lần trong 90 ngày)
- ✅ Xem đánh giá đã gửi và đã nhận
- ✅ Rating trung bình và tổng số đánh giá

#### Quản lý File đính kèm
- ✅ Upload ảnh (tối đa 5 ảnh, mỗi ảnh tối đa 10MB)
- ✅ Upload video (tối đa 1 video, tối đa 10MB)
- ✅ Hiển thị gallery ảnh/video trên trang chi tiết tin đăng
- ✅ Download và preview attachments

#### Quản lý Cá nhân
- ✅ Quản lý hồ sơ cá nhân (xem/sửa thông tin)
- ✅ Xem đánh giá đã gửi và đã nhận
- ✅ Quản lý tin đăng của tôi (xem trạng thái, đơn hàng liên quan)
- ✅ Quản lý đơn hàng (mua và bán)
- ✅ Danh sách yêu thích (vẫn có thể xem tin đã có đơn hàng)

#### Quản trị viên
- ✅ Xác minh tin đăng
- ✅ Xem báo cáo tổng quan
- ✅ Quản lý người dùng

### Mobile App (React Native + Expo)

#### Xác thực
- ✅ Màn hình đăng nhập/đăng ký đẹp mắt
- ✅ Tự động kiểm tra và validate token
- ✅ Session expired handling với thông báo rõ ràng
- ✅ Bảo vệ routes với authentication guard

#### Trang chủ (Home)
- ✅ Danh sách xe với search real-time (debounced)
- ✅ Bộ lọc: năm sản xuất, giá, dung lượng pin
- ✅ Hiển thị trạng thái yêu thích
- ✅ Pull to refresh
- ✅ UI/UX hiện đại, minimalist

#### Chi tiết Xe (Listing Detail)
- ✅ **Đánh giá AI** - Tính năng chính:
  - Tự động load khi vào trang
  - Format text đẹp (headings, numbered lists, paragraphs)
  - Expand/Collapse để kiểm soát độ dài nội dung
  - Tự động loại bỏ markdown formatting
- ✅ **Gallery ảnh/video**: Hiển thị tất cả attachments (ảnh và video)
- ✅ **Thông tin thanh toán**: 
  - Hiển thị phương thức thanh toán (Tiền mặt/VietQR)
  - Chi tiết VietQR (ngân hàng, số tài khoản, số tiền, nội dung)
  - Cảnh báo lừa đảo nổi bật
- ✅ **Liên kết hồ sơ người bán**: Xem thông tin và đánh giá người bán
- ✅ Thông tin chi tiết xe
- ✅ Nút yêu thích đồng bộ real-time
- ✅ Mua ngay (tự động vô hiệu hóa nếu tin đã có đơn hàng)

#### Quản lý Cá nhân
- ✅ **Tin đăng của tôi**: 
  - Xem tất cả tin đăng đã tạo
  - Kiểm tra trạng thái tin đăng
  - Xem đơn hàng liên quan đến từng tin
  - Điều hướng đến chi tiết đơn hàng
- ✅ **Đơn hàng của tôi**: 
  - Xem đơn hàng đã mua (người mua)
  - Xem đơn hàng đã nhận (người bán)
  - Màu sắc theo trạng thái (PENDING, PAID, CANCELLED, CLOSED)
  - Điều hướng đến chi tiết đơn hàng
- ✅ **Danh sách yêu thích**: 
  - Xem tất cả tin đăng đã yêu thích
  - Vẫn có thể xem tin đã có đơn hàng (nhưng nút đặt hàng bị vô hiệu hóa)
- ✅ **Hồ sơ cá nhân**: 
  - Xem/sửa thông tin cá nhân
  - Xem đánh giá đã gửi
  - Xem đánh giá đã nhận

#### Tạo Tin đăng
- ✅ Form tạo tin với validation đầy đủ
- ✅ **Phương thức thanh toán**: 
  - Chọn thanh toán tiền mặt hoặc VietQR
  - Form động cho thông tin VietQR (ngân hàng, số tài khoản, số tiền, nội dung)
  - Danh sách ngân hàng từ API
- ✅ **Upload ảnh/video**: 
  - Chọn tối đa 5 ảnh và 1 video
  - Mỗi file tối đa 10MB
  - Preview và xóa attachments trước khi đăng
  - Bắt buộc ít nhất 1 attachment
- ✅ AI price suggestion với format ngắn gọn, thị trường Việt Nam
- ✅ UI/UX professional với keyboard handling thông minh
- ✅ Dynamic padding để tránh bàn phím che input

#### Chi tiết Đơn hàng (Order Detail)
- ✅ **Thông tin đơn hàng**: 
  - Trạng thái đơn hàng với icon và màu sắc
  - Thông tin xe đầy đủ
  - Thông tin liên hệ người mua/người bán
- ✅ **Thông tin thanh toán**: 
  - Phương thức thanh toán và chi tiết
  - Mã QR VietQR (nếu áp dụng)
  - Cảnh báo lừa đảo và hướng dẫn thanh toán an toàn
- ✅ **Phân tích AI**: 
  - Insights về người bán (dựa trên lịch sử và đánh giá)
  - Phân tích giá tin đăng
  - Thống kê người bán (rating TB, tổng đánh giá, đã bán)
- ✅ **Hành động**: 
  - Hủy đơn hàng (có lý do)
  - Xác nhận đã thanh toán (người mua)
  - Xác nhận đã nhận tiền (người bán)
  - Để lại đánh giá (sau khi đơn hàng đóng)

#### Quản trị (Admin)
- ✅ Dashboard quản trị
- ✅ Xác minh tin đăng
- ✅ Quản lý toàn bộ hệ thống

#### Hồ sơ Người bán (Seller Profile)
- ✅ Xem thông tin người bán
- ✅ Rating trung bình và tổng số đánh giá
- ✅ Danh sách đánh giá đầy đủ (màn hình riêng)
- ✅ Tab xem tin đăng hiện tại
- ✅ Tab xem lịch sử đã bán

## 🛠 Công nghệ sử dụng

### Backend
- **Framework**: Spring Boot 3.5.7
- **Database**: SQL Server
- **ORM**: Spring Data JPA / Hibernate
- **Security**: Spring Security + JWT
- **AI**: Google Gemini API (gemini-2.0-flash-lite)
- **API Docs**: Swagger/OpenAPI
- **Build Tool**: Maven

### Mobile
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation (Stack Navigator + Bottom Tabs)
- **State Management**: Zustand
- **HTTP Client**: Axios + native fetch (for file uploads)
- **Storage**: AsyncStorage
- **UI Components**: React Native Components + Material Community Icons
- **Image/Video Picker**: Expo ImagePicker
- **File Upload**: Native FormData with fetch API

## 📦 Cài đặt

### Yêu cầu
- Java 17+
- Maven 3.6+
- Node.js 16+
- SQL Server
- Expo CLI (`npm install -g expo-cli`)

### Backend

```bash
cd backend
mvn clean install
```

### Mobile

```bash
cd mobile
npm install
```

## ⚙️ Cấu hình

### Backend Environment Variables

Tạo file `.env` trong thư mục `backend` hoặc set environment variables:

```powershell
# PowerShell
$env:DB_URL="jdbc:sqlserver://localhost:1433;databaseName=iheartev;trustServerCertificate=true"
$env:DB_USER="sa"
$env:DB_PASSWORD="12345"
$env:GEMINI_API_KEY="your_gemini_api_key_here"
$env:JWT_SECRET="dGhpcyBpcyBhIHNlY3JldCBrZXkgZm9yIGp3dCB0b2tlbiBzaWduaW5nIGFuZCB2ZXJpZmljYXRpb24="
```

### Mobile Environment Variables

```powershell
# Set API URL (for Android Emulator)
setx EXPO_PUBLIC_API_URL "http://10.0.2.2:3000"

# For iOS Simulator or Physical Device
setx EXPO_PUBLIC_API_URL "http://localhost:3000"
# or
setx EXPO_PUBLIC_API_URL "http://your-local-ip:3000"
```

## 🚀 Chạy ứng dụng

### Backend

```bash
cd backend
./mvnw spring-boot:run
# hoặc
mvn spring-boot:run
```

Backend sẽ chạy tại: `http://localhost:3000`

### Mobile

```bash
cd mobile
npm start
# hoặc
npm run android  # Cho Android
npm run ios      # Cho iOS
npm run web      # Cho Web
```

## 📚 API Documentation

Sau khi backend chạy, truy cập Swagger UI tại:
- **URL**: `http://localhost:3000/swagger-ui.html`
- **OpenAPI Docs**: `http://localhost:3000/v3/api-docs`

## 🔐 Test Accounts

Mật khẩu cho tất cả test accounts: `Password123!`

**Admin:**
- Email: `admin@iheartev.com`
- Password: `Password123!`

**Members:**
- Email: `member@iheartev.local`, `seller1@iheartev.local`, `seller2@iheartev.local`
- Email: `buyer1@iheartev.local`, `buyer2@iheartev.local`
- Password: `Password123!`

**Note**: Dữ liệu mẫu bao gồm nhiều tin đăng (EV và Battery), đơn hàng ở các trạng thái khác nhau, và đánh giá để test đầy đủ các tính năng.

## 📱 Tính năng nổi bật

### AI-Powered Analysis
- Tự động phân tích và đánh giá xe điện
- So sánh giá với thị trường
- Đưa ra lời khuyên hữu ích
- Format text đẹp mắt, dễ đọc

### Real-time Synchronization
- Đồng bộ trạng thái yêu thích giữa các màn hình
- Auto-refresh khi quay lại màn hình
- Session management thông minh

### Modern UI/UX
- Thiết kế minimalist, professional
- Smooth animations và transitions
- Responsive và user-friendly
- Dark/Light theme support (StatusBar)
- Keyboard handling thông minh (tự động scroll, dynamic padding)
- Visual feedback cho tất cả actions
- Loading states và error handling rõ ràng

### Comprehensive Features
- **Seller Profile System**: Xem hồ sơ, đánh giá, và lịch sử bán hàng
- **Payment Integration**: VietQR với danh sách ngân hàng đầy đủ
- **Order Management**: Vòng đời đơn hàng đầy đủ từ tạo đến đóng
- **AI Insights**: Phân tích người bán và giá cả trong chi tiết đơn hàng
- **File Attachments**: Upload và hiển thị ảnh/video cho tin đăng
- **Review System**: Đánh giá 2 chiều (mua-bán) với giới hạn chỉnh sửa

## 🔧 Cấu trúc Project

```
iheartev/
├── backend/                    # Spring Boot Backend
│   ├── src/
│   │   └── main/
│   │       ├── java/
│   │       │   └── com/iheartev/api/
│   │       │       ├── admin/          # Admin features
│   │       │       ├── ai/              # AI integration
│   │       │       ├── attachment/      # File upload/download
│   │       │       ├── auth/            # Authentication
│   │       │       ├── listing/         # Listings management
│   │       │       ├── me/              # Personal data endpoints
│   │       │       ├── payment/         # Payment info (VietQR)
│   │       │       ├── security/        # JWT & Security config
│   │       │       ├── social/          # Reviews & Favorites
│   │       │       ├── transaction/     # Orders & AI insights
│   │       │       └── user/            # User & Seller profiles
│   │       └── resources/
│   │           ├── data.sql                    # Seed data
│   │           └── migration_*.sql             # Migration scripts
│   ├── uploads/                # Uploaded files storage
│   └── pom.xml
│
├── mobile/                     # React Native Mobile App
│   ├── src/
│   │   ├── screens/            # Screen components
│   │   │   ├── CreateListingScreen.js
│   │   │   ├── CreateReviewScreen.js
│   │   │   ├── HomeScreen.js
│   │   │   ├── ListingDetailScreen.js
│   │   │   ├── OrderDetailScreen.js
│   │   │   ├── ProfileScreen.js
│   │   │   ├── SellerProfileScreen.js
│   │   │   └── SellerRatingsScreen.js
│   │   ├── services/           # API services
│   │   │   ├── api.js                 # Axios instance & interceptors
│   │   │   ├── attachmentService.js   # File upload (using fetch)
│   │   │   ├── bankService.js         # Bank list
│   │   │   └── ...
│   │   ├── store/              # Zustand state management
│   │   ├── hooks/              # Custom hooks (useAuthGuard)
│   │   └── utils/              # Utilities (currencyFormatter)
│   ├── DEBUG_LOGS.md           # Guide to view console logs
│   └── package.json
│
└── README.md
```

## 📝 Notes

### Database
- Database sẽ tự động được tạo và seed data khi backend khởi động lần đầu
- Dữ liệu mẫu bao gồm: users, listings (EV & Battery), orders (various statuses), reviews, favorites, payment info
- Migration scripts có sẵn trong `backend/src/main/resources/` để cập nhật schema nếu cần

### Security & Authentication
- JWT token có thời hạn 120 phút (có thể cấu hình)
- Tất cả endpoints ngoại trừ auth, AI overview, bank list, và attachment download đều yêu cầu authentication
- Session expired handling tự động với thông báo rõ ràng

### File Upload
- Attachments được lưu trong thư mục `backend/uploads/`
- Hỗ trợ ảnh (JPEG, PNG) và video (MP4)
- Giới hạn: tối đa 5 ảnh + 1 video, mỗi file tối đa 10MB

### Payment
- Hỗ trợ 2 phương thức: Tiền mặt khi nhận hàng và Chuyển khoản VietQR
- VietQR yêu cầu đầy đủ: ngân hàng, số tài khoản, số tiền, nội dung chuyển khoản
- Cảnh báo lừa đảo được hiển thị rõ ràng

### Order Lifecycle
- **PENDING**: Đơn hàng mới tạo, chưa thanh toán
- **PAID**: Người mua đã xác nhận thanh toán
- **CANCELLED**: Đơn hàng bị hủy (bởi người mua hoặc người bán)
- **CLOSED**: Đơn hàng hoàn tất, người bán đã xác nhận nhận tiền

### Reviews & Ratings
- Đánh giá chỉ có thể tạo sau khi đơn hàng đã đóng
- Chỉnh sửa tối đa 2 lần trong 90 ngày kể từ khi tạo
- Cả người mua và người bán đều có thể đánh giá nhau

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is for educational purposes.

---

**Made with ❤️ for FPT University MMA301**
