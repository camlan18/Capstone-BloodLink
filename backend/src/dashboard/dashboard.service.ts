import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(startDateStr?: string, endDateStr?: string, facilityIdStr?: string) {
    // Determine dates
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // default 7 days ago
    startDate.setHours(0, 0, 0, 0);

    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (startDateStr) {
      startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);
    }
    if (endDateStr) {
      endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
    }

    const facilityId = facilityIdStr ? parseInt(facilityIdStr, 10) : undefined;

    // Build common filter for facility if applicable (Note: not all tables have facility_id directly)
    // blood_donations -> schedule -> facility
    // blood_requests -> facility

    // 1. Lượt hiến máu hôm nay (Today's donations)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayDonationsCount = await this.prisma.donations.count({
      where: {
        donation_date: {
          gte: todayStart,
          lte: todayEnd
        },
        ...(facilityId && {
          facility_id: facilityId
        })
      }
    });

    // 2. Tổng thể tích máu thu nhận trong khoảng thời gian (Total volume)
    const inventoryInPeriod = await this.prisma.blood_inventory.aggregate({
      _sum: {
        volume_ml: true
      },
      where: {
        collection_date: {
          gte: startDate,
          lte: endDate
        },
        ...(facilityId && {
          facility_id: facilityId
        })
      }
    });
    const totalVolume = inventoryInPeriod._sum.volume_ml || 0;

    // 3. Người đăng ký mới (New donors in period)
    const newDonorsCount = await this.prisma.users.count({
      where: {
        role_id: 3, // Assuming 3 is DONOR
        created_at: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // 4. Chiến dịch đang mở (Active campaigns/schedules)
    const activeCampaignsCount = await this.prisma.facility_donation_schedules.count({
      where: {
        status: 'OPEN',
        ...(facilityId && {
          facility_id: facilityId
        })
      }
    });

    const pendingStatus = await this.prisma.blood_request_statuses.findUnique({ where: { status_code: 'PENDING' } });

    // 5. Yêu cầu từ bệnh viện (Pending requests)
    const pendingRequestsCount = pendingStatus ? await this.prisma.blood_requests.count({
      where: {
        status_id: pendingStatus.status_id,
        ...(facilityId && {
          facility_id: facilityId
        })
      }
    }) : 0;

    // 6. Tổng số người hiến (Total donors overall)
    const totalDonorsCount = await this.prisma.users.count({
      where: {
        role_id: 3
      }
    });

    // --- ALERTS ---
    
    // Alert 1: Low Blood Inventory (e.g., < 10 bags)
    const inventoryByBloodType = await this.prisma.blood_inventory.groupBy({
      by: ['blood_type_id'],
      where: {
        status_code: 'AVAILABLE',
        ...(facilityId && {
          facility_id: facilityId
        })
      },
      _count: {
        inventory_id: true
      }
    });
    
    const bloodTypes = await this.prisma.blood_types.findMany();
    const lowInventoryTypes = inventoryByBloodType
      .filter(item => item._count.inventory_id < 10)
      .map(item => {
        const bt = bloodTypes.find(b => b.blood_type_id === item.blood_type_id);
        return bt ? bt.blood_type_code : 'Unknown';
      });

    // Alert 2: Emergency Requests
    const emergencyRequestsCount = pendingStatus ? await this.prisma.blood_requests.count({
      where: {
        status_id: pendingStatus.status_id,
        is_emergency: true,
        ...(facilityId && {
          facility_id: facilityId
        })
      }
    }) : 0;

    // Alert 3: Upcoming schedules (Next 7 days)
    const upcomingDate = new Date();
    upcomingDate.setDate(upcomingDate.getDate() + 7);
    const upcomingSchedulesCount = await this.prisma.facility_donation_schedules.count({
      where: {
        status: 'SCHEDULED',
        date: {
          gte: new Date(),
          lte: upcomingDate
        },
        ...(facilityId && {
          facility_id: facilityId
        })
      }
    });

    // Alert 4: Pending Posts/Comments
    const pendingCommentsCount = 0; 

    // --- CHART DATA ---
    const donationsInRange = await this.prisma.donations.findMany({
      where: {
        donation_date: {
          gte: startDate,
          lte: endDate
        },
        ...(facilityId && {
          facility_id: facilityId
        })
      },
      select: {
        donation_date: true
      }
    });

    const chartMap = new Map<string, number>();
    
    const tempDate = new Date(startDate);
    while (tempDate <= endDate) {
      const dateStr = `${String(tempDate.getDate()).padStart(2, '0')}/${String(tempDate.getMonth() + 1).padStart(2, '0')}`;
      chartMap.set(dateStr, 0);
      tempDate.setDate(tempDate.getDate() + 1);
    }

    donationsInRange.forEach((d: any) => {
      const dateStr = `${String(d.donation_date.getDate()).padStart(2, '0')}/${String(d.donation_date.getMonth() + 1).padStart(2, '0')}`;
      if (chartMap.has(dateStr)) {
        chartMap.set(dateStr, chartMap.get(dateStr)! + 1);
      }
    });

    const chartData = Array.from(chartMap.entries()).map(([date, count]) => ({
      date,
      count
    }));

    return {
      stats: {
        todayDonations: todayDonationsCount,
        totalVolume: totalVolume,
        newDonors: newDonorsCount,
        activeCampaigns: activeCampaignsCount,
        pendingRequests: pendingRequestsCount,
        totalDonors: totalDonorsCount
      },
      alerts: {
        lowInventory: lowInventoryTypes.join(', ') || 'Không có',
        emergencyRequests: emergencyRequestsCount,
        pendingComments: pendingCommentsCount,
        upcomingSchedules: upcomingSchedulesCount
      },
      chartData: chartData
    };
  }
}
