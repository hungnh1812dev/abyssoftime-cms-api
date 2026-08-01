"use client";

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Globe,
  List,
  Microscope,
  Package,
  Percent,
  Printer,
  Search,
  ShieldCheck,
  Star,
  Syringe,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import React from "react";

import { useVaccineFilters } from "@/views/vaccine/useVaccineFilters";
import type { VaccinePageData } from "@/views/vaccine/vaccine.types";

interface VaccinePageProps {
  data: VaccinePageData;
}

export default function VaccinePage({ data }: VaccinePageProps) {
  const { recommended } = data;
  const { activeTab, setActiveTab, searchTerm, setSearchTerm, expandedGroups, toggleGroup, filteredData, vnvcPackageStats } = useVaccineFilters(data);

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans text-gray-800">
      <div className="bg-blue-600 px-4 pb-16 pt-8 text-center text-white shadow-md print:hidden">
        <h1 className="mb-3 text-3xl font-bold md:text-4xl">Tra Cứu & So Sánh Vắc-xin</h1>
        <p className="mx-auto max-w-2xl text-blue-100">
          Hệ thống tra cứu thông tin chi tiết về các loại vắc-xin phổ biến cho trẻ em, danh mục đề xuất và công cụ so sánh tự động các Gói tiêm chủng.
        </p>
      </div>

      <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 print:mt-0 print:px-0">
        <div className="mb-6 flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-2 shadow-lg sm:flex-row print:hidden">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex flex-1 items-center justify-center rounded-lg px-4 py-3 text-sm font-bold transition-all sm:text-base ${activeTab === "all" ? "border border-blue-100 bg-blue-50 text-blue-700 shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}>
            <List className="mr-2 h-5 w-5" />
            Tất cả Vắc-xin
          </button>
          <button
            onClick={() => setActiveTab("recommended")}
            className={`flex flex-1 items-center justify-center rounded-lg px-4 py-3 text-sm font-bold transition-all sm:text-base ${activeTab === "recommended" ? "border border-amber-100 bg-amber-50 text-amber-700 shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}>
            <Star className="mr-2 h-5 w-5" />
            Vắc-xin Đề Nghị
          </button>
          <button
            onClick={() => setActiveTab("vnvc")}
            className={`flex flex-1 items-center justify-center rounded-lg px-4 py-3 text-sm font-bold transition-all sm:text-base ${activeTab === "vnvc" ? "border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}>
            <Package className="mr-2 h-5 w-5" />
            Đánh giá Gói VNVC
          </button>
        </div>

        {activeTab === "all" && (
          <div>
            <div className="mb-6 flex items-center rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <Search className="mr-3 h-6 w-6 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên bệnh (vd: phế cầu) hoặc tên vắc-xin (vd: Hexaxim)..."
                className="w-full flex-1 bg-transparent text-lg text-gray-700 placeholder-gray-400 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="p-2 text-gray-400 transition-colors hover:text-red-500">
                  <XCircle className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="space-y-6">
              {filteredData.map((group) => {
                const isExpanded = expandedGroups.includes(group.id) || !!searchTerm;
                return (
                  <div key={group.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all">
                    <button onClick={() => toggleGroup(group.id)} className="flex w-full items-center justify-between bg-gray-50 px-6 py-4 transition-colors hover:bg-blue-50">
                      <h2 className="pr-4 text-left text-xl font-bold text-blue-900 md:text-2xl">{group.disease}</h2>
                      <div className="shrink-0 rounded-full bg-white p-2 text-blue-600 shadow-sm">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div
                        className={`grid grid-cols-1 gap-6 bg-white p-6 ${group.vaccines.length > 1 ? "lg:grid-cols-2" : ""} ${group.vaccines.length === 3 ? "2xl:grid-cols-3" : ""}`}>
                        {group.vaccines.map((vaccine, idx) => (
                          <div key={idx} className="flex h-full flex-col rounded-xl border border-gray-100 bg-slate-50/50 p-5 transition-all hover:border-blue-300 hover:shadow-md">
                            <div className="mb-4 flex items-start justify-between border-b border-gray-200 pb-4">
                              <div>
                                <h3 className="text-2xl font-extrabold text-blue-700">{vaccine.name}</h3>
                                <div className="mt-1 flex items-center space-x-3 text-sm text-gray-500">
                                  <span className="flex items-center">
                                    <Globe className="mr-1 h-4 w-4" /> {vaccine.origin}
                                  </span>
                                  <span className="flex items-center">
                                    <Calendar className="mr-1 h-4 w-4" /> {vaccine.year}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800">
                                <DollarSign className="mr-0.5 h-4 w-4" />
                                {vaccine.price}
                              </div>
                            </div>
                            <div className="mb-6 flex-grow space-y-3">
                              <div className="flex items-start">
                                <Syringe className="mr-2 mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                                <div>
                                  <span className="block text-sm font-semibold text-gray-700">Phác đồ:</span>
                                  <span className="text-gray-600">{vaccine.doses}</span>
                                </div>
                              </div>
                              <div className="flex items-start">
                                <Microscope className="mr-2 mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                                <div>
                                  <span className="block text-sm font-semibold text-gray-700">Công nghệ:</span>
                                  <span className="text-gray-600">{vaccine.tech}</span>
                                </div>
                              </div>
                              <div className="flex items-start">
                                <ShieldCheck className="mr-2 mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                                <div>
                                  <span className="block text-sm font-semibold text-gray-700">Hiệu quả:</span>
                                  <span className="text-gray-600">{vaccine.protection}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-auto grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
                              <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                                <h4 className="mb-2 flex items-center text-sm font-bold text-green-800">
                                  <CheckCircle2 className="mr-1 h-4 w-4" /> Ưu điểm
                                </h4>
                                <p className="text-sm leading-relaxed text-green-700">{vaccine.pros}</p>
                              </div>
                              <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                                <h4 className="mb-2 flex items-center text-sm font-bold text-red-800">
                                  <XCircle className="mr-1 h-4 w-4" /> Nhược điểm
                                </h4>
                                <p className="text-sm leading-relaxed text-red-700">{vaccine.cons}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "recommended" && (
          <div className="overflow-hidden rounded-xl border border-amber-100 bg-white shadow-md print:border-none print:shadow-none">
            <div className="flex flex-col items-start justify-between border-b border-amber-100 bg-amber-50 p-6 sm:flex-row print:mb-4 print:border-none print:bg-white print:p-0">
              <div className="mb-4 flex items-start sm:mb-0">
                <div className="mr-4 rounded-full bg-white p-3 text-amber-500 shadow-sm print:hidden">
                  <ThumbsUp className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="mb-2 text-2xl font-bold text-amber-800 print:text-black">Danh sách Vắc-xin Tối Ưu Cho Bé</h2>
                  <p className="text-amber-700 print:text-gray-800">
                    Dựa trên tiêu chí: <strong className="font-bold">Không màng giá thành - Giảm số mũi tiêm - Gộp nhiều bệnh - Ít tác dụng phụ.</strong> Đây là những lựa chọn được
                    đánh giá cao nhất.
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.print()}
                className="flex shrink-0 items-center rounded-lg bg-amber-600 px-5 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-amber-700 print:hidden">
                <Printer className="mr-2 h-5 w-5" /> In danh sách
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50 text-xs font-normal uppercase leading-normal text-gray-600 sm:text-sm">
                    <th className="w-1/5 border-b px-4 py-4 font-bold text-gray-700">Tên Bệnh</th>
                    <th className="w-1/4 border-b px-4 py-4 font-bold text-gray-700">Vắc-xin & Chi phí</th>
                    <th className="w-2/5 border-b px-4 py-4 font-bold text-gray-700">Lý Do Đề Xuất</th>
                    <th className="border-b px-4 py-4 text-right font-bold text-gray-700">Tổng Ước Tính</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-700 sm:text-base">
                  {recommended.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 transition-colors hover:bg-amber-50/30">
                      <td className="px-4 py-5 align-top font-semibold text-gray-800">{item.disease}</td>
                      <td className="px-4 py-5 align-top">
                        <div className="mb-2 flex items-center">
                          <Syringe className="mr-2 h-4 w-4 shrink-0 text-amber-600" />
                          <span className="text-lg font-bold text-amber-700">{item.vaccine}</span>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div className="flex items-center">
                            <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-gray-400" /> {item.doses}
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="mr-2 h-3.5 w-3.5 text-gray-400" /> {item.price} đ/liều
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 align-top">
                        <div className="flex">
                          <CheckCircle2 className="mr-3 mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                          <span className="leading-relaxed text-gray-600">{item.reason}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-5 text-right align-top font-bold text-blue-700">{new Intl.NumberFormat("vi-VN").format(item.total)} đ</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-amber-200 bg-amber-100/40 print:border-gray-300 print:bg-gray-100">
                    <td colSpan={3} className="px-4 py-6 text-right text-lg font-extrabold uppercase tracking-wide text-amber-900 print:text-gray-900">
                      Tổng ngân sách (Giai đoạn 0 - 24 tháng):
                    </td>
                    <td className="whitespace-nowrap px-4 py-6 text-right text-xl font-extrabold text-red-600 print:text-black">
                      {new Intl.NumberFormat("vi-VN").format(recommended.reduce((acc, curr) => acc + curr.total, 0))} đ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "vnvc" && (
          <div>
            <div className="mb-8 flex items-start rounded-xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
              <div className="mr-4 shrink-0 rounded-full bg-white p-3 text-emerald-600 shadow-sm">
                <Percent className="h-8 w-8" />
              </div>
              <div>
                <h2 className="mb-2 text-2xl font-bold text-emerald-800">So sánh 20 Gói Tiêm 0-24 Tháng thực tế (Mô phỏng)</h2>
                <p className="leading-relaxed text-emerald-700">
                  Dữ liệu được cập nhật bám sát danh mục thực tế của VNVC <strong className="font-bold">(sử dụng Priorix + Varilrix thay cho Proquad để đảm bảo nguồn cung)</strong>{" "}
                  và đối chiếu với Danh sách Đề nghị tối ưu. Gói nào có tỷ lệ trùng khớp càng cao thì bé càng được tiếp cận với các mũi vắc-xin tiên tiến nhất.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {vnvcPackageStats.stats.map((pkg) => {
                const isBestMatch = pkg.matchPercentage === vnvcPackageStats.maxMatch;
                return (
                  <div
                    key={pkg.id}
                    className={`relative flex h-full flex-col rounded-xl bg-white p-6 transition-all ${isBestMatch ? "z-10 border-4 border-amber-400 shadow-xl md:scale-105" : "border border-gray-200 shadow-sm hover:shadow-md"}`}>
                    {isBestMatch && (
                      <div className="absolute -right-4 -top-4 flex rotate-3 transform items-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 text-sm font-black uppercase tracking-wide text-white shadow-lg">
                        <Star className="mr-1 h-4 w-4 fill-white" /> Đề xuất cao nhất
                      </div>
                    )}

                    <div className="mb-4 border-b border-gray-100 pb-4">
                      <h3 className={`mb-1 text-xl font-extrabold ${isBestMatch ? "text-amber-700" : "text-gray-800"}`}>{pkg.name}</h3>
                      <div className="flex items-center font-bold text-emerald-700">
                        <DollarSign className="mr-0.5 h-4 w-4" />
                        Giá gói: {pkg.price} VNĐ
                      </div>
                    </div>

                    <div className="mb-6 flex items-center">
                      <div className="relative mr-4 h-16 w-16 shrink-0">
                        <svg className="h-16 w-16 -rotate-90 transform">
                          <circle className="text-gray-200" strokeWidth="6" stroke="currentColor" fill="transparent" r="28" cx="32" cy="32" />
                          <circle
                            className={pkg.matchPercentage >= 80 ? "text-green-500" : pkg.matchPercentage >= 50 ? "text-amber-500" : "text-gray-400"}
                            strokeWidth="6"
                            strokeDasharray={28 * 2 * Math.PI}
                            strokeDashoffset={28 * 2 * Math.PI - (pkg.matchPercentage / 100) * 28 * 2 * Math.PI}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="28"
                            cx="32"
                            cy="32"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-gray-800">{pkg.matchPercentage}%</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold uppercase tracking-wide text-gray-500">Trùng khớp đề nghị</div>
                        <div className="text-sm text-gray-700">Đạt {pkg.matched.length} / 11 vắc-xin chuẩn</div>
                      </div>
                    </div>

                    <div className="flex-grow space-y-4">
                      {pkg.matched.length > 0 && (
                        <div>
                          <div className="mb-1 flex items-center text-sm font-bold text-green-700">
                            <CheckCircle2 className="mr-1 h-4 w-4" /> Vắc-xin chuẩn:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {pkg.matched.map((v) => (
                              <span key={v} className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700">
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {pkg.alternatives.length > 0 && (
                        <div>
                          <div className="mb-1 flex items-center text-sm font-bold text-amber-700">
                            <AlertCircle className="mr-1 h-4 w-4" /> Dùng thuốc loại khác:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {pkg.alternatives.map((v) => (
                              <span key={v} className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {pkg.missing.length > 0 && (
                        <div>
                          <div className="mb-1 flex items-center text-sm font-bold text-red-600">
                            <XCircle className="mr-1 h-4 w-4" /> Gói này không có (hoặc bị tách lẻ):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {pkg.missing.map((v) => (
                              <span key={v} className="rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-xs text-gray-500 line-through opacity-70">
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 rounded-lg bg-gray-100 p-4 text-center text-sm text-gray-600">
              * Dữ liệu 20 Gói VNVC ở trên mang tính chất <strong>MÔ PHỎNG SÁT THỰC TẾ</strong>. Lưu ý: Mức trùng khớp cao nhất chỉ đạt khoảng 91% là vì VNVC đã chủ động tách mũi
              gộp Proquad thành 2 mũi (Priorix + Varilrix) để tránh rủi ro lỡ lịch tiêm của bé khi Proquad bị khan hiếm toàn cầu.
            </div>
          </div>
        )}
      </div>

      <div className="mb-8 mt-12 px-4 text-center text-sm text-gray-500 print:mt-6 print:text-left print:text-xs">
        * Lưu ý: Giá thành và Phác đồ chỉ mang tính tham khảo, vui lòng nhờ bác sĩ khám sàng lọc tư vấn cụ thể trước khi tiêm.
      </div>
    </div>
  );
}
