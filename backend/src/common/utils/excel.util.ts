import * as xlsx from 'xlsx';

export class ExcelUtil {
  /**
   * Tạo buffer Excel từ mảng các object
   */
  static generateExcel(data: any[], sheetName: string = 'Sheet1'): Buffer {
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Tạo buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  /**
   * Tạo file Excel mẫu từ danh sách cột (headers)
   */
  static generateTemplate(headers: string[], sheetName: string = 'Template'): Buffer {
    const data = [headers.reduce((acc, curr) => ({ ...acc, [curr]: '' }), {})];
    return this.generateExcel(data, sheetName);
  }

  /**
   * Đọc file Excel từ buffer thành mảng object
   */
  static parseExcel(buffer: Buffer): any[] {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(worksheet);
  }
}
