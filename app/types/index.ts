export interface CccdData {
  soCanCuoc: string
  hoTen: string
  ngaySinh: string
  gioiTinh: string
  quocTich: string
  queQuan: string
  thuongTru: string
  ngayHetHan: string
  // Not on CCCD front — user fills manually
  capNgay: string
  capTai: string
}

export interface CompanionInfo {
  hoTen: string
  soDienThoai: string
  soCCCD: string
  capNgay: string
  capTai: string
  ngaySinh: string
  hoKhau: string
  sdtNguoiThan: string
}

export type ContractType = "thue-nha" | "phu-luc" | "cam-ket-chay" | "cam-ket-noi-quy" | "dat-coc"

export interface ContractDetails {
  loaiHopDong: ContractType

  // ── Raw CCCD text (for display) ───────────────────────────────────────
  rawCccdFront?: string
  rawCccdBack?: string

  // ── Signing date ─────────────────────────────────────────────────────
  ngayKy: string   // DD
  thangKy: string  // MM
  namKy: string    // YYYY

  // ── Bên A (Young House — pre-filled, can be changed) ─────────────────
  benA_ten: string
  benA_mst: string
  benA_diaChi: string
  benA_sdt: string

  // ── Bên B extras (not always on CCCD) ────────────────────────────────
  benB_sdt: string
  benB_sdtNguoiThan: string

  // ── Người ở cùng (up to 3) ───────────────────────────────────────────
  nguoiOCung: CompanionInfo[]

  // ── Room / property ──────────────────────────────────────────────────
  soPhong: string
  soNguoiO: string
  soXeMay: string
  bienSoXe: string

  // ── Pricing ──────────────────────────────────────────────────────────
  giaThue: string
  giaThueText: string
  ngayGiaKhongDoiDen: string
  tienCoc: string
  tienCocText: string
  phiQuanLy: string

  // ── Payment schedule ─────────────────────────────────────────────────
  phuongThucThanhToan: string  // e.g. "1" or "3"
  dot1Tu: string
  dot1Den: string
  dot1HanChot: string

  // ── Contract period ──────────────────────────────────────────────────
  ngayBatDau: string   // DD/MM/YYYY
  ngayKetThuc: string  // DD/MM/YYYY

  // ── Annex (PHỤ LỤC) specific ─────────────────────────────────────────
  toaNha?: string               // tòa nhà, VD: YH11

  // ── Deposit slip (GIẤY ĐẶT CỌC) specific ────────────────────────────
  soThangThue?: string          // số tháng thuê
  thoiGianTinhTien?: string     // thời gian tính tiền thuê nhà
  ngayHenKyHopDong?: string     // hẹn ngày ký hợp đồng chính thức (DD/MM/YYYY)
  dienMuaDong?: string          // đơn giá điện mùa đông (đồng/số)
  dienMuaHe?: string            // đơn giá điện mùa hè (đồng/số)
  anTheoThang?: boolean         // dịch vụ ăn theo tháng
  donVeSinhTheoThang?: boolean  // dịch vụ dọn vệ sinh theo tháng
}
