import {
  AlignmentType,
  Document,
  LineRuleType,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType,
} from "docx";
import type { CccdData, CompanionInfo, ContractDetails } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FONT = "Times New Roman";
const SZ = 26; // 13 pt (half-points)
const SZ_TITLE = 28; // 14 pt

const cm = (v: number) => Math.round(v * 567); // 1 cm ≈ 567 twips

/** Return value or dotted placeholder if empty */
const val = (v: string | undefined, dots = "………………………………………") =>
  v?.trim() || dots;

/** Split "DD/MM/YYYY" into parts */
function splitDate(s: string): [string, string, string] {
  const parts = (s ?? "").split("/");
  return [parts[0] ?? "……", parts[1] ?? "……", parts[2] ?? "202……"];
}

type ParOpts = {
  bold?: boolean;
  center?: boolean;
  size?: number;
  underline?: boolean;
  indent?: number;
  italic?: boolean;
  spaceAfter?: number;
  spaceBefore?: number;
};

function par(text: string, opts: ParOpts = {}): Paragraph {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    indent: opts.indent ? { left: opts.indent } : undefined,
    spacing: {
      line: 360,
      lineRule: LineRuleType.AUTO,
      after: opts.spaceAfter ?? 60,
      before: opts.spaceBefore ?? 0,
    },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        font: FONT,
        size: opts.size ?? SZ,
        underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
        italics: opts.italic,
      }),
    ],
  });
}

/** Paragraph with mixed bold/normal runs on the same line */
function mixedPar(
  runs: Array<{ text: string; bold?: boolean; size?: number }>,
  opts: ParOpts = {}
): Paragraph {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    indent: opts.indent ? { left: opts.indent } : undefined,
    spacing: {
      line: 360,
      lineRule: LineRuleType.AUTO,
      after: opts.spaceAfter ?? 60,
      before: opts.spaceBefore ?? 0,
    },
    children: runs.map(
      (r) =>
        new TextRun({
          text: r.text,
          bold: r.bold,
          font: FONT,
          size: r.size ?? opts.size ?? SZ,
        })
    ),
  });
}

function blank(): Paragraph {
  return new Paragraph({
    spacing: { after: 0, before: 0 },
    children: [new TextRun({ text: "" })],
  });
}

function article(num: number, title: string): Paragraph {
  return par(`ĐIỀU ${num}: ${title}`, { bold: true, spaceAfter: 60, spaceBefore: 80 });
}

function sub(label: string): Paragraph {
  return par(label, { bold: true, spaceAfter: 40 });
}

function point(letter: string, text: string): Paragraph {
  return par(`${letter}) ${text}`, { indent: cm(0.75), spaceAfter: 40 });
}

// ─── Companion block ─────────────────────────────────────────────────────────

function companionBlock(n: number, c: Partial<CompanionInfo>): Paragraph[] {
  return [
    mixedPar([
      { text: `${n}. Ông/ bà:`, bold: false },
      { text: val(c.hoTen), bold: false },
      { text: "  Số Điện thoại:", bold: false },
      { text: val(c.soDienThoai), bold: false },
    ]),
    mixedPar([
      { text: "Số CCCD/HC: " },
      { text: val(c.soCCCD) },
      { text: "  Cấp ngày:" },
      { text: val(c.capNgay) },
      { text: "  Tại: " },
      { text: val(c.capTai) },
    ]),
    mixedPar([
      { text: "Ngày/tháng/năm sinh: " },
      { text: val(c.ngaySinh) },
    ]),
    mixedPar([
      { text: "Hộ khẩu thường trú:" },
      { text: val(c.hoKhau) },
    ]),
    mixedPar([
      { text: "Số điện thoại người thân khi cần liên lạc:" },
      { text: val(c.sdtNguoiThan) },
    ]),
  ];
}

// ─── Young House Rental Contract ─────────────────────────────────────────────

export async function generateRentalContract(
  cccd: Partial<CccdData>,
  d: ContractDetails
): Promise<Blob> {
  const [ngayKy, thangKy, namKy] = [
    val(d.ngayKy, "……"),
    val(d.thangKy, "……"),
    val(d.namKy, "202……"),
  ];

  const [ngayBD, thangBD, namBD] = splitDate(d.ngayBatDau);
  const [ngayKT, thangKT, namKT] = splitDate(d.ngayKetThuc);

  const dash = "………………………………………";
  const shortDash = "………………………";

  // Companion blocks
  const companions = d.nguoiOCung ?? [];
  while (companions.length < 3) companions.push({} as CompanionInfo);
  const companionParagraphs: Paragraph[] = companions.flatMap((c, i) =>
    companionBlock(i + 1, c)
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: cm(2),
              right: cm(2),
              bottom: cm(2),
              left: cm(3),
            },
          },
        },
        children: [
          // ── Header ──────────────────────────────────────────────────
          par("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", {
            bold: true,
            center: true,
            size: SZ_TITLE,
          }),
          par("Độc lập - Tự do - Hạnh phúc", {
            bold: true,
            center: true,
            size: SZ,
            italic: true,
          }),
          blank(),
          blank(),
          par("HỢP ĐỒNG THUÊ NHÀ", {
            bold: true,
            center: true,
            size: SZ_TITLE,
            underline: true,
            spaceAfter: 80,
          }),

          // ── Legal basis ──────────────────────────────────────────────
          par("- Căn cứ Bộ luật dân sự nước Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam;"),
          par("- Căn cứ Luật Nhà ở ngày 29 tháng 11 năm 2005;"),
          par("- Căn cứ vào các quy định của pháp luật hiện hành;"),
          par("- Căn cứ nhu cầu và năng lực của hai bên,"),

          // ── Date / place ─────────────────────────────────────────────
          mixedPar([
            { text: "Hôm nay: Ngày " },
            { text: ngayKy, bold: true },
            { text: " tháng " },
            { text: thangKy, bold: true },
            { text: " năm " },
            { text: namKy, bold: true },
          ]),
          mixedPar([
            { text: "Tại: " },
            { text: val(d.benA_diaChi, "Số 85 Đường Mục Uyên - Công Nghệ, Xã Hạ Bằng, Thành phố Hà Nội") },
          ]),
          par("Chúng tôi gồm có:"),

          // ── BÊN A ────────────────────────────────────────────────────
          mixedPar([
            { text: "BÊN CHO THUÊ NHÀ (BÊN A): ", bold: true },
            {
              text: val(d.benA_ten, "CÔNG TY TNHH ĐẦU TƯ VÀ THƯƠNG MẠI YOUNG HOUSE"),
              bold: true,
            },
          ]),
          mixedPar([
            { text: "Mã số thuế: " },
            { text: val(d.benA_mst, "0111355826") },
          ]),
          mixedPar([
            { text: "Địa chỉ: " },
            { text: val(d.benA_diaChi, "Số 85 Đường Mục Uyên - Công Nghệ, Xã Hạ Bằng, Thành phố Hà Nội, Việt Nam") },
          ]),
          mixedPar([
            { text: "Số điện thoại: " },
            { text: val(d.benA_sdt, "0962 888 797") },
          ]),

          // ── BÊN B ────────────────────────────────────────────────────
          par("BÊN THUÊ NHÀ (BÊN B):", { bold: true }),
          mixedPar([
            { text: "Ông/ bà: " },
            { text: val(cccd.hoTen) },
            { text: "  Số Điện thoại:" },
            { text: val(d.benB_sdt) },
          ]),
          mixedPar([
            { text: "Số CCCD/HC: " },
            { text: val(cccd.soCanCuoc) },
            { text: "  Cấp ngày:" },
            { text: val(cccd.capNgay) },
            { text: "  Tại: " },
            { text: val(cccd.capTai) },
          ]),
          mixedPar([
            { text: "Ngày/tháng/năm sinh: " },
            { text: val(cccd.ngaySinh) },
          ]),
          mixedPar([
            { text: "Hộ khẩu thường trú:" },
            { text: val(cccd.thuongTru) },
          ]),
          mixedPar([
            { text: "Số điện thoại người thân khi cần liên lạc:" },
            { text: val(d.benB_sdtNguoiThan) },
          ]),

          // Companions
          par("Người ở cùng:", { bold: true }),
          ...companionParagraphs,

          par("Sau khi bàn bạc hai bên thống nhất đi đến ký kết Hợp đồng thuê nhà với các nội dung sau:"),

          // ── Điều 1 ───────────────────────────────────────────────────
          article(1, "ĐỐI TƯỢNG HỢP ĐỒNG CHO THUÊ:"),
          mixedPar([
            { text: "1.1. Địa chỉ cho thuê: Phòng " },
            { text: val(d.soPhong, "YH11-……"), bold: true },
          ]),
          mixedPar([
            { text: "1.2. Số lượng người ở trong phòng: " },
            { text: val(d.soNguoiO, "……") },
          ]),
          par("1.3. Bên B thuê phòng mục đích sử dụng là để ở."),
          mixedPar([
            { text: "1.4. Số lượng xe máy:" },
            { text: val(d.soXeMay, "") },
            { text: "  Biển số xe: " },
            { text: val(d.bienSoXe, "") },
          ]),

          // ── Điều 2 ───────────────────────────────────────────────────
          article(2, "TÀI SẢN VÀ TRANG THIẾT BỊ GẮN LIỀN VỚI NHÀ"),
          par("2.1. Các thiết bị trong phòng bao gồm: ..............Theo Bảng Kê..................................."),
          par("2.2. Các thiết bị trong nhà vệ sinh bao gồm: Đèn nhà vệ sinh, 1 chậu rửa mặt, vòi hoa sen, 01 bồn cầu, vòi xịt, giá để xà phòng, gương soi………………………"),
          par("Tất cả các thiết bị trên đã bàn giao cho Bên B đều hoạt động bình thường. Mọi hư hỏng trong quá trình sử dụng Bên B phải tự bỏ tiền sửa chữa, thay thế, hoặc bồi thường cho Bên A."),

          // ── Điều 3 ───────────────────────────────────────────────────
          article(3, "GIÁ NHÀ CHO THUÊ VÀ PHƯƠNG THỨC THANH TOÁN"),
          mixedPar([
            { text: "3.1. Giá cho thuê phòng là : " },
            { text: val(d.giaThue, ""), bold: true },
            { text: " VNĐ/1 tháng." },
          ]),
          mixedPar([
            { text: "(Bằng chữ: " },
            { text: val(d.giaThueText, dash + dash + dash + " đồng") },
            { text: ")" },
          ]),
          par("Giá thuê nhà đã bao gồm Thuế VAT."),
          mixedPar([
            { text: "Giá thuê nhà không đổi từ ngày ký hợp đồng đến ngày " },
            { text: val(d.ngayGiaKhongDoiDen, dash) },
            { text: " Sau khi kết thúc hợp đồng, nếu bên B tiếp tục thuê phòng của bên A, hai bên sẽ thỏa thuận về giá thuê mới." },
          ]),
          mixedPar([
            { text: "3.2. Số tiền đặt cọc: " },
            { text: val(d.tienCoc, "………………………………"), bold: true },
            { text: " VNĐ." },
          ]),
          mixedPar([
            { text: "(Bằng chữ: " },
            { text: val(d.tienCocText, dash + dash + dash + " đồng") },
            { text: ")" },
          ]),
          par("Tiền đặt cọc sẽ được Bên A trả lại cho Bên B khi:"),
          par("* Bên B kết thúc Hợp đồng đúng thời hạn và không có phát sinh nào xảy ra.", { indent: cm(0.5) }),
          par("* Khi kết thúc hợp đồng, bên B thông báo cho bên A trước ít nhất 30 ngày.", { indent: cm(0.5) }),
          par("* Bên B không vi phạm điều khoản nào trong hợp đồng này.", { indent: cm(0.5) }),
          par("Nếu Bên B vi phạm nội dung Hợp đồng hoặc đơn phương chấm dứt Hợp đồng trước thời hạn thì phải chịu mất hoàn toàn số tiền đặt cọc."),
          mixedPar([
            { text: "3.3 Phí quản lý tòa nhà: " },
            { text: val(d.phiQuanLy, "…………") },
            { text: " đồng/người/tháng." },
          ]),
          par("Chú ý: Tiền quản lý chung đã bao gồm các khoản khấu hao các thiết bị sử dụng chung."),
          par("3.4 Đối với tiền Điện: Bên B thu hộ tiền điện và nộp lại cho EVN theo quy định của nhà nước. Tiền điện gồm điện sử dụng trong phòng ở của khách hàng và điện phát sinh từ khu vực sinh hoạt chung (không quá 3.200 đồng/số)."),
          mixedPar([
            { text: "3.5. Phương thức thanh toán: " },
            { text: val(d.phuongThucThanhToan, "……") },
            { text: " tháng/lần, bằng tiền mặt hoặc chuyển khoản." },
          ]),
          mixedPar([
            { text: "- Đợt 1: Từ ngày " },
            { text: val(d.dot1Tu, shortDash) },
            { text: " đến ngày " },
            { text: val(d.dot1Den, shortDash) },
            { text: "  Thời gian thanh toán muộn nhất ngày: " },
            { text: val(d.dot1HanChot, shortDash) },
          ]),
          par("- Các đợt thanh toán tiếp theo sẽ thanh toán vào các ngày từ ngày 25 đến ngày 30 tháng trước. Trường hợp đến hạn thanh toán tiền nhà, nếu quá 3 ngày Bên B không nộp tiền nhà thì coi như Bên B đơn phương chấm dứt Hợp đồng và không được trả lại tiền đặt cọc, Bên A có quyền trục xuất các đồ đạc của Bên B ra ngoài và không chịu bất cứ vấn đề gì liên quan đến tài sản của Bên B."),

          // ── Điều 4 ───────────────────────────────────────────────────
          article(4, "THỜI ĐIỂM GIAO NHẬN NHÀ VÀ THỜI HẠN CHO THUÊ"),
          sub("4.1. Thời hạn thuê nhà:"),
          mixedPar([
            { text: "Nhà cho thuê kể từ ngày " },
            { text: ngayBD, bold: true },
            { text: " tháng " },
            { text: thangBD, bold: true },
            { text: " năm " },
            { text: namBD, bold: true },
            { text: " đến ngày " },
            { text: ngayKT, bold: true },
            { text: " tháng " },
            { text: thangKT, bold: true },
            { text: " năm " },
            { text: namKT, bold: true },
          ]),
          sub("4.2. Điều khoản về việc chấm dứt Hợp đồng thuê nhà và gia hạn hợp đồng thuê nhà:"),
          par("- Hợp đồng chấm dứt khi:"),
          par("+ Khi hết hạn Hợp đồng thuê nhà, Bên B báo trước cho Bên A 30 ngày và bàn giao nhà cho Bên A muộn không quá 01 ngày so với ngày kết thúc hợp đồng Bên B mới được nhận lại cọc.", { indent: cm(0.5) }),
          par("+ Khi chấm dứt Hợp đồng thuê nhà, Bên B phải bàn giao nhà đúng ngày cho Bên A. Bàn giao muộn quá 01 ngày mà không được sự đồng ý của Bên A sẽ được coi là vi phạm hợp đồng và Bên B mất cọc.", { indent: cm(0.5) }),
          par("+ Hai bên thoả thuận chấm dứt Hợp đồng trước thời hạn;", { indent: cm(0.5) }),
          par("+ Nhà ở cho thuê phải phá dỡ hoặc do thực hiện quy hoạch xây dựng của nhà nước;", { indent: cm(0.5) }),
          par("+ Hai bên không thỏa thuận được về mức tăng tiền nhà sau khi kết thúc hợp đồng;", { indent: cm(0.5) }),
          par("+ Khi một trong hai bên vi phạm các điều khoản hợp đồng…", { indent: cm(0.5) }),
          par("- Trường hợp Bên B thanh lý hợp đồng trước hạn:"),
          par("+ Bên A tạo điều kiện cho Bên B tự tìm người thay thế.", { indent: cm(0.5) }),
          par("+ Trường hợp Bên B nhờ Bên A tìm khách thay thế: phí sale phòng là 50% của tiền cọc phòng.", { indent: cm(0.5) }),
          par("+ Khi khách mới (do Bên A hoặc Bên B tìm) ký hợp đồng, Bên B sẽ được nhận lại cọc (sau khi trừ các chi phí – nếu có). Tiền thuê nhà tính từ ngày đầu tiên khách mới ký hợp đồng và thanh toán tiền thuê nhà cho Bên A.", { indent: cm(0.5) }),
          par("+ Nếu Bên B thanh lý hợp đồng thuê nhà trước hạn mà không tìm được khách mới thay thế, Bên B sẽ mất cọc. Mọi chi phí phát sinh của bên B (hỏng đồ đạc, tiền điện…), bên B phải chịu hoặc được trừ vào tiền nhà bên B đã đóng nhưng chưa sử dụng (nếu có).", { indent: cm(0.5) }),
          par("- Vì 1 lý do nào đó, bên A muốn lấy lại phòng phải thông báo cho bên B trước ít nhất 15 ngày. Bên A sẽ trả lại tiền cọc cho bên B và tiền thuê nhà bên B đóng còn thừa (nếu có), sau khi đã trừ các chi phí phát sinh."),

          // ── Điều 5 ───────────────────────────────────────────────────
          article(5, "QUYỀN VÀ NGHĨA VỤ BÊN A"),
          sub("5.1. Quyền của Bên cho thuê:"),
          point("a", "Yêu cầu Bên thuê trả đủ tiền thuê nhà đúng thời hạn ghi trong Hợp đồng."),
          point("b", "Yêu cầu Bên thuê có trách nhiệm trong việc sửa chữa phần hư hỏng, bồi thường thiệt hại do lỗi của Bên thuê gây ra."),
          point("c", "Nhận lại nhà trong các trường hợp chấm dứt Hợp đồng thuê nhà."),
          point("d", "Được lấy lại phòng cho thuê khi báo cho bên B trước 15 ngày. Bên A trả lại cọc và tiền nhà chưa sử dụng (nếu có) cho bên B sau khi đã trừ các chi phí phát sinh, và không phải đền bù theo các điều khoản khác."),
          sub("5.2. Nghĩa vụ của Bên cho thuê:"),
          point("a", "Giao nhà ở và trang thiết bị gắn liền với nhà ở (nếu có) cho Bên thuê đúng ngày quy định của Hợp đồng này."),
          point("b", "Phổ biến cho Bên thuê Nội quy về quản lý sử dụng nhà ở tại tòa nhà."),
          point("c", "Bảo đảm quyền sử dụng trọn vẹn phần sử dụng riêng của Bên thuê. Cung cấp những giấy tờ cần thiết liên quan đến ngôi nhà đang cho Bên B thuê."),
          point("d", "Chịu hoàn toàn trách nhiệm trước pháp luật về quyền sở hữu và diện tích nhà cho thuê, không có sự tranh chấp, thế chấp, ..."),
          point("đ", "Sửa chữa nhà khi có những hư hỏng khách quan không do Bên B gây ra. Hoặc khi bên B mới nhận phòng, trong vòng 30 ngày (kể từ ngày bên A bàn giao nhà cho bên B) thì Bên A sẽ sửa chữa những hư hỏng thiết bị miễn phí."),
          point("e", "Yêu cầu bên B giữ gìn nhà và có trách nhiệm trong việc sửa chữa những hư hỏng do mình gây ra."),
          point("f", "Cam kết thực hiện đúng Hợp đồng này như đã thỏa thuận với Bên B."),

          // ── Điều 6 ───────────────────────────────────────────────────
          article(6, "QUYỀN VÀ NGHĨA VỤ BÊN B"),
          sub("6.1. Quyền của Bên thuê:"),
          point("a", "Nhận nhà ở và trang thiết bị (nếu có) theo đúng ngày quy định tại khoản 5.1 điều 5 của Hợp đồng này."),
          point("b", "Yêu cầu Bên cho thuê sửa chữa kịp thời những hư hỏng không phải do bên thuê gây ra để bảo đảm an toàn."),
          point("c", "Đơn phương chấm dứt Hợp đồng thuê nhà khi Bên cho thuê có một trong các hành vi vi phạm quy định của hợp đồng."),
          sub("6.2. Nghĩa vụ của Bên thuê:"),
          point("a", "Trả đủ tiền thuê nhà đúng thời hạn ghi trong Hợp đồng (5 ngày kể từ ngày nhận phiếu thu). Nếu trả muộn sẽ bị phạt theo quy định."),
          point("b", "Sử dụng nhà không được có các hành vi vi phạm pháp luật; giữ gìn nhà ở và có trách nhiệm trong việc sửa chữa những hư hỏng, mất mát tài sản mà bên A đã bàn giao. Bảo dưỡng điều hòa, nóng lạnh theo thời hạn là 1 lần/1 thời hạn hợp đồng, có sự chứng kiến của bên cho thuê (nếu không thì bên cho thuê tự gọi thợ bảo dưỡng và chi phí bên thuê phải trả)."),
          point("c", "Chấp hành đầy đủ những quy định về quản lý sử dụng nhà ở (trường hợp bị rò rỉ hoặc hỏng đường nước, chập cháy điện thì bên B phải có trách nhiệm thông báo ngay cho bên A để xử lý, nếu bên B không thông báo khi bên A kiểm tra phát hiện sẽ phạt 500.000đ/lần). Nếu tái phạm thì bên A có quyền đơn phương chấm dứt hợp đồng mà không phải trả lại cọc cho bên B."),
          point("d", "Chấp hành các quy định về giữ gìn vệ sinh môi trường và an ninh trật tự trong khu vực cư trú."),
          point("đ", "Giao lại nhà cho Bên cho thuê trong các trường hợp chấm dứt hợp đồng quy định tại điều 5 của Hợp đồng này."),
          point("e", "Bên B có trách nhiệm giữ gìn nhà và có trách nhiệm trong việc sửa chữa những hư hỏng do mình gây ra."),
          point("f", "Cam kết thực hiện đúng hợp đồng này như đã thỏa thuận với bên A."),
          point("g", "Tiến hành làm tạm trú với công an phường/xã trong vòng 15 ngày kể từ ngày chuyển đến ở. Nếu công an vào kiểm tra mà không có tạm trú sẽ bị phạt tiền, bên thuê hoàn toàn chịu trách nhiệm. Trường hợp Công an vào kiểm tra phạt cả chủ và khách thì bên thuê phải chịu toàn bộ số tiền phạt này. Và tiền phạt của bên cho thuê sẽ trừ vào tiền cọc của bên thuê và thu bù tiền cọc vào tháng kế tiếp. Nếu bên thuê không đóng thì xem như vi phạm hợp đồng và sẽ bị thu hồi lại phòng."),
          point("i", "Nếu bên B để xảy ra cháy nổ gây thiệt hại đến người và tài sản thì phải đền bù và chịu trách nhiệm trước pháp luật."),
          point("k", "Bên B không được phép lập bất cứ loại bàn thờ nào trong phòng trọ, nếu vi phạm bên A có quyền đơn phương chấm dứt hợp đồng và bên B không được trả lại tiền cọc nhà."),
          point("l", "Bên B tự bảo quản mọi tài sản của mình. Nếu mất, bên A không chịu trách nhiệm."),
          point("m", "Bên B khi đưa khách vào chơi trong tòa nhà phải tự xuống mở cửa khi khách đến và đóng cửa khi khách về. Bên B phải quản lý khách của mình. Nếu để xảy ra trộm cắp tài sản, bên A sẽ trích xuất camera và dấu vân tay, dựa trên thời gian khách vào nhà để làm căn cứ và bên B phải đền bù cho người thiệt hại."),
          point("n", "Khi có khách ở lại qua đêm, bên B phải thông báo cho bên A và phải được sự đồng ý của bên A. Đồng thời, khách phải để CMND/CCCD tại phòng Bảo vệ (nếu có), hoặc chụp CCCD/CMND của khách gửi cho bên A. Khách đến chơi không được ở quá 01 đêm. Từ đêm thứ 02 trở đi, bên A sẽ thu phí dịch vụ 50.000 đồng/khách/ngày. Nếu bên B cố tình vi phạm, bên B sẽ bị trục xuất khỏi nhà và mất cọc."),
          point("o", "Hành lang là không gian chung và là lối thoát hiểm khi rủi ro cháy nổ của mọi cư dân trong tòa nhà. Bên B không được phép chiếm dụng hành lang để đồ đạc, giày dép, nấu nướng… Nếu vi phạm, bên B sẽ bị xử lý theo Nội quy của Tòa nhà."),
          point("p", "Trong thời gian 30 ngày bên B báo chuyển nhà cho bên A, bên B hỗ trợ mở cửa để bên A đưa khách mới vào xem nhà."),
          point("q", "Không tổ chức tụ tập, ồn ào sau 22h00 đêm tránh ảnh hưởng tới các cư dân khác và hàng xóm xung quanh. Nếu vi phạm, bên B sẽ bị xử lý theo Nội quy của tòa nhà."),
          point("r", "Tự chịu trách nhiệm trước pháp luật về các hành vi vi phạm pháp luật do mình gây ra, tự bảo quản tài sản cá nhân của mình như quần áo, vật dụng trong và ngoài phòng. Ban quản lý tòa nhà không chịu trách nhiệm với bất kỳ mất mát nào."),
          point("s", "Bên B khi kết thúc hợp đồng phải bàn giao lại phòng cho bên A theo đúng hiện trạng ban đầu: nhà sạch, tường sạch, thiết bị còn sử dụng tốt… Nếu phòng bẩn, tường bẩn, thiết bị hỏng mà bên B không sửa chữa, bên A sẽ sửa và trừ vào tiền đặt cọc của bên B."),

          // ── Điều 7 ───────────────────────────────────────────────────
          article(7, "CAM KẾT CÁC BÊN"),
          par("7.1. Hai bên cam kết thực hiện đúng các nội dung đã ký. Nếu xảy ra mâu thuẫn thì phải cùng nhau tìm biện pháp thỏa hiệp và giải quyết trên nguyên tắc hai bên cùng có lợi và tôn trọng lẫn nhau. Nếu không tự thỏa hiệp được thì sẽ nhờ cơ quan chức năng có thẩm quyền giải quyết."),
          par("7.2. Bên nào vi phạm hợp đồng hoặc muốn chấm dứt Hợp đồng thuê nhà trước thời hạn thì sẽ bị mất tương đương với số tiền đã đặt cọc."),
          par("7.3. Hợp đồng được lập thành 02 bản và có giá trị pháp lý như nhau. Mỗi bên giữ 01 bản. Hợp đồng này có giá trị kể từ ngày hai bên ký kết."),
          blank(),
          blank(),

          // ── Signatures ───────────────────────────────────────────────
          new Paragraph({
            spacing: { line: 360, lineRule: LineRuleType.AUTO, after: 0 },
            children: [
              new TextRun({ text: "         ĐẠI DIỆN BÊN A", bold: true, font: FONT, size: SZ }),
              new TextRun({ text: "                                        ĐẠI DIỆN BÊN B", bold: true, font: FONT, size: SZ }),
            ],
          }),
          new Paragraph({
            spacing: { line: 360, lineRule: LineRuleType.AUTO, after: 0 },
            children: [
              new TextRun({ text: "         (Ký, đóng dấu, ghi rõ họ tên)", font: FONT, size: SZ, italics: true }),
              new TextRun({ text: "                         (Ký, ghi rõ họ tên)", font: FONT, size: SZ, italics: true }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

// ─── Deposit Contract (generic) ───────────────────────────────────────────────

export async function generateDepositContract(
  cccd: Partial<CccdData>,
  d: ContractDetails
): Promise<Blob> {
  const [ngayKy, thangKy, namKy] = [
    val(d.ngayKy, "……"),
    val(d.thangKy, "……"),
    val(d.namKy, "202……"),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: cm(2), right: cm(2), bottom: cm(2), left: cm(3) } },
        },
        children: [
          par("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { bold: true, center: true, size: SZ_TITLE }),
          par("Độc lập – Tự do – Hạnh phúc", { bold: true, center: true, italic: true }),
          par("──────────────────────────", { center: true }),
          blank(),
          par("HỢP ĐỒNG ĐẶT CỌC THUÊ NHÀ", { bold: true, center: true, size: SZ_TITLE, underline: true }),
          blank(),
          mixedPar([
            { text: "Hôm nay, ngày " }, { text: ngayKy, bold: true },
            { text: " tháng " }, { text: thangKy, bold: true },
            { text: " năm " }, { text: namKy, bold: true },
            { text: `, tại ${val(d.benA_diaChi, "Số 85 Đường Mục Uyên - Công Nghệ, Xã Hạ Bằng, Thành phố Hà Nội")}` },
          ]),
          par("Chúng tôi gồm có:"),
          blank(),

          mixedPar([{ text: "BÊN NHẬN CỌC (BÊN A – Chủ nhà): ", bold: true }, { text: val(d.benA_ten, "CÔNG TY TNHH ĐẦU TƯ VÀ THƯƠNG MẠI YOUNG HOUSE"), bold: true }]),
          par(`Địa chỉ: ${val(d.benA_diaChi, "Số 85 Đường Mục Uyên - Công Nghệ, Xã Hạ Bằng, Thành phố Hà Nội, Việt Nam")}`),
          par(`Số điện thoại: ${val(d.benA_sdt, "0962 888 797")}`),
          blank(),

          par("BÊN ĐẶT CỌC (BÊN B – Người thuê):", { bold: true }),
          par(`Ông/Bà: ${val(cccd.hoTen)}  –  Ngày sinh: ${val(cccd.ngaySinh)}`),
          par(`Số CCCD/CMND: ${val(cccd.soCanCuoc)}  –  Điện thoại: ${val(d.benB_sdt)}`),
          par(`Địa chỉ thường trú: ${val(cccd.thuongTru)}`),
          blank(),

          article(1, "NỘI DUNG ĐẶT CỌC"),
          par(`Bên B đặt cọc cho Bên A số tiền là: ${val(d.tienCoc)} đồng (${val(d.tienCocText)})`),
          par(`Mục đích: đặt cọc thuê phòng ${val(d.soPhong, "YH11-……")} tại địa chỉ: ${val(d.benA_diaChi)}`),
          par(`Giá thuê dự kiến: ${val(d.giaThue)} đồng/tháng`),
          par(`Thời gian dự kiến ký hợp đồng thuê chính thức: ${val(d.ngayBatDau)}`),
          blank(),

          article(2, "TRÁCH NHIỆM CÁC BÊN"),
          par("1. Nếu Bên B từ chối thuê sau khi đã đặt cọc, Bên B mất toàn bộ tiền cọc.", { indent: cm(0.75) }),
          par("2. Nếu Bên A từ chối cho thuê sau khi đã nhận cọc, Bên A phải hoàn trả tiền cọc và bồi thường thêm một khoản bằng số tiền cọc cho Bên B.", { indent: cm(0.75) }),
          par("3. Khi hợp đồng thuê chính thức được ký kết, tiền đặt cọc sẽ được tính vào tiền cọc hoặc tiền thuê tháng đầu theo thoả thuận.", { indent: cm(0.75) }),
          par("4. Trong thời gian hiệu lực hợp đồng này, Bên A cam kết không cho người khác thuê phòng nêu trên.", { indent: cm(0.75) }),
          blank(),

          article(3, "CAM KẾT"),
          par("Hợp đồng có hiệu lực kể từ ngày ký đến khi hai bên hoàn thành nghĩa vụ. Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản."),
          blank(),
          blank(),

          new Paragraph({
            spacing: { line: 360, lineRule: LineRuleType.AUTO, after: 0 },
            children: [
              new TextRun({ text: "         ĐẠI DIỆN BÊN A", bold: true, font: FONT, size: SZ }),
              new TextRun({ text: "                                        ĐẠI DIỆN BÊN B", bold: true, font: FONT, size: SZ }),
            ],
          })
          
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
