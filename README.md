# LyricCut Studio

Trình biên tập video PHP/Laragon với nhận dạng lyrics bằng mô hình đa ngôn ngữ tự host.

## Cách chạy trong Laragon

1. Dùng Python 3.13 trong Laragon (`C:\laragon\bin\python\python-3.13`) hoặc cài Python 3.13/3.11.
2. Nhấp đúp `asr\install.bat` một lần. Lần đầu cần Internet để cài thư viện và tải mô hình Large-v3 (nhiều GB).
3. Mở Laragon, bấm **Start All**, vào `http://localhost/`, rồi chọn tệp và **Nhận diện trên server**. PHP tự khởi động Python model nền khi cần; không cần mở `asr\start.bat`.

## Đưa app lên mạng bằng mô hình tự host

- Triển khai cả thư mục web lên máy chủ có PHP, PHP cURL và Python; máy chủ cần RAM/CPU đủ để chạy Whisper Large-v3. Shared hosting thường không cho chạy tiến trình Python liên tục, nên cần VPS/máy chủ riêng.
- Cài mô hình một lần bằng `asr\install.bat`. Proxy PHP tự khởi động Python service nền khi cần; `asr\start.bat` chỉ còn là cách chạy thủ công để chẩn đoán.
- Trang web gửi tệp đến `asr-proxy.php` trên cùng miền. PHP proxy chuyển dữ liệu đến Python tại `127.0.0.1:8765`; cổng mô hình không mở ra Internet. Thư mục `asr` bị Apache chặn truy cập HTTP để không lộ mã và trọng số mô hình.
- Tài khoản chạy PHP/Apache cần quyền ghi trong `asr` để tạo khóa autostart và file log.
- Bật HTTPS cho website. Tăng `upload_max_filesize` và `post_max_size` trong `php.ini` nếu cần nhận tệp lớn (mức giới hạn của app là 500 MB).
- Các tệp tải lên chỉ được giữ tạm trong lúc nhận dạng và xóa sau khi xử lý. Không có API AI bên thứ ba hay API key.

## SEO và domain công khai

- Thay `yourdomain.com` bằng domain HTTPS thật của bạn và cấu hình biến môi trường `LYRICCUT_PUBLIC_URL=https://yourdomain.com` cho PHP/Apache trước khi triển khai. Khởi động lại Apache sau khi đổi biến này.
- `robots.txt` và `sitemap.xml` được Apache rewrite sang `robots.php` và `sitemap.php`. Cần bật `mod_rewrite` và cho phép `.htaccess` (`AllowOverride All`); trong Laragon, bật rewrite module nếu các URL này trả 404.
- Khi chạy ở localhost hoặc domain nội bộ, trang được đặt `noindex` và sitemap rỗng. Với domain công khai, trang chính và hướng dẫn được đưa vào sitemap.
- Sau khi website truy cập công khai qua HTTPS, xác minh domain trong Google Search Console và gửi `https://yourdomain.com/sitemap.xml`. Việc lên hạng tìm kiếm phụ thuộc nội dung, khả năng crawl, mức cạnh tranh và tín hiệu thực tế; metadata không đảm bảo thứ hạng cụ thể.

## Nhận dạng ngôn ngữ

Whisper Large-v3 nhận dạng đa ngôn ngữ và phát hiện ngôn ngữ; giao diện lấy danh sách ngôn ngữ từ chính mô hình đang chạy. Đây không phải cam kết hỗ trợ mọi ngôn ngữ trên thế giới hay chép đúng tuyệt đối lyrics. Nhạc nền, bè, phát âm luyến láy và chất lượng thu âm ảnh hưởng lớn đến kết quả; cần rà soát trước khi xuất bản thương mại.

## Tính năng giao diện hiện có

- Tải video, ảnh và âm thanh; phát ảnh tĩnh hoặc video kèm nhạc.
- Timeline có thể nhấp/kéo để tua; chuột phải mở menu thao tác trên app.
- Nhận dạng lyrics trên server tự host, lấy timestamp theo từng từ rồi gom thành dòng phụ đề ngắn.
- Thanh tiến độ nhận trạng thái của job nhận dạng từ server và đạt 100% khi hoàn tất.
- Chữ chỉ hiển thị trong khoảng thời gian câu được hát; nhấp câu trên timeline tua tới đúng mốc bắt đầu.
- Sửa câu, nhân bản hoặc xóa; chỉnh phông, kích thước, màu, viền và vị trí.

Đây vẫn là prototype: dựng/xuất video thành tệp, tài khoản, lưu dự án và giới hạn sử dụng theo người dùng chưa được triển khai.
