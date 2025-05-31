const axios = require('axios');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const apiKey = process.env.KOREA_TOURISM_API_KEY;
    const { region, status = 'all' } = req.query; // status: ongoing, upcoming, all
    
    if (!apiKey) {
      return res.json({
        success: true,
        data: {
          ongoing: getSampleFestivals('ongoing'),
          upcoming: getSampleFestivals('upcoming'),
          total: 8,
          message: 'API 키 설정 필요 - 샘플 데이터'
        }
      });
    }

    // 현재 날짜
    const today = new Date();
    const todayStr = today.toISOString().slice(0,10).replace(/-/g, '');
    
    // 한 달 후 날짜
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthStr = nextMonth.toISOString().slice(0,10).replace(/-/g, '');

    // 전국 축제 정보 조회 (지역별로 여러 번 호출)
    const regions = region ? [getAreaCode(region)] : [1, 6, 39, 32, 37, 4, 5, 3]; // 주요 지역들
    
    const festivalPromises = regions.map(async (areaCode) => {
      try {
        const response = await axios.get('http://apis.data.go.kr/B551011/KorService1/searchFestival1', {
          params: {
            serviceKey: apiKey,
            numOfRows: 100,
            pageNo: 1,
            MobileOS: 'ETC',
            MobileApp: 'HealingK',
            _type: 'json',
            listYN: 'Y',
            arrange: 'A',
            eventStartDate: todayStr,
            eventEndDate: nextMonthStr,
            areaCode: areaCode
          },
          timeout: 8000
        });

        if (response.data?.response?.header?.resultCode === '0000') {
          return response.data.response.body?.items?.item || [];
        }
        return [];
      } catch (error) {
        console.error(`지역 ${areaCode} 축제 조회 오류:`, error.message);
        return [];
      }
    });

    const allFestivalResults = await Promise.all(festivalPromises);
    const allFestivals = allFestivalResults.flat();

    // 축제 데이터 가공
    const processedFestivals = allFestivals.map(festival => {
      const startDate = festival.eventstartdate;
      const endDate = festival.eventenddate;
      const now = new Date();
      const todayDate = now.toISOString().slice(0,10).replace(/-/g, '');
      
      let festivalStatus = 'upcoming';
      if (startDate <= todayDate && endDate >= todayDate) {
        festivalStatus = 'ongoing';
      } else if (endDate < todayDate) {
        festivalStatus = 'ended';
      }

      return {
        id: festival.contentid,
        title: festival.title || '축제명 없음',
        location: festival.addr1 || festival.eventplace || '장소 미정',
        region: getRegionName(festival.areacode),
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        startDateRaw: startDate,
        endDateRaw: endDate,
        status: festivalStatus,
        tel: festival.tel || '',
        image: festival.firstimage || festival.firstimage2 || null,
        mapx: festival.mapx,
        mapy: festival.mapy,
        daysLeft: calculateDaysLeft(startDate, endDate, todayDate),
        category: festival.cat3 || festival.cat2 || '축제',
        isToday: startDate === todayDate || (startDate <= todayDate && endDate >= todayDate)
      };
    });

    // 상태별로 분류
    const ongoing = processedFestivals
      .filter(f => f.status === 'ongoing')
      .sort((a, b) => a.endDateRaw.localeCompare(b.endDateRaw))
      .slice(0, 20);

    const upcoming = processedFestivals
      .filter(f => f.status === 'upcoming')
      .sort((a, b) => a.startDateRaw.localeCompare(b.startDateRaw))
      .slice(0, 20);

    const thisWeekend = processedFestivals.filter(f => {
      const startDate = new Date(f.startDateRaw.slice(0,4), f.startDateRaw.slice(4,6)-1, f.startDateRaw.slice(6,8));
      const endDate = new Date(f.endDateRaw.slice(0,4), f.endDateRaw.slice(4,6)-1, f.endDateRaw.slice(6,8));
      const thisSaturday = getThisSaturday();
      const thisSunday = getThisSunday();
      
      return (startDate <= thisSunday && endDate >= thisSaturday);
    }).slice(0, 10);

    // 통계 계산
    const stats = {
      total: processedFestivals.length,
      ongoing: ongoing.length,
      upcoming: upcoming.length,
      thisWeekend: thisWeekend.length,
      regions: [...new Set(processedFestivals.map(f => f.region))].length,
      popularRegions: getPopularRegions(processedFestivals)
    };

    return res.json({
      success: true,
      data: {
        ongoing,
        upcoming,
        thisWeekend,
        stats,
        message: '🎪 실시간 축제 정보',
        time: new Date().toLocaleString('ko-KR'),
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('축제 정보 조회 오류:', error);
    
    return res.json({
      success: true,
      data: {
        ongoing: getSampleFestivals('ongoing'),
        upcoming: getSampleFestivals('upcoming'),
        thisWeekend: getSampleFestivals('weekend'),
        stats: {
          total: 8,
          ongoing: 3,
          upcoming: 5,
          thisWeekend: 2
        },
        message: `⚠️ 대체 데이터: ${error.message}`,
        time: new Date().toLocaleString('ko-KR')
      }
    });
  }
};

// 지역 코드 매핑
function getAreaCode(regionName) {
  const codes = {
    '서울': 1, '부산': 6, '제주': 39, '강릉': 32, '전주': 37,
    '대구': 4, '광주': 5, '대전': 3, '인천': 2, '울산': 7
  };
  return codes[regionName] || 1;
}

// 지역명 매핑
function getRegionName(areacode) {
  const regions = {
    1: '서울', 6: '부산', 39: '제주', 32: '강원', 37: '전북',
    4: '대구', 5: '광주', 3: '대전', 2: '인천', 7: '울산'
  };
  return regions[areacode] || '기타';
}

// 날짜 포맷팅
function formatDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return '날짜 미정';
  
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  
  return `${year}.${month}.${day}`;
}

// 남은 일수 계산
function calculateDaysLeft(startDate, endDate, today) {
  const start = new Date(startDate.slice(0,4), startDate.slice(4,6)-1, startDate.slice(6,8));
  const end = new Date(endDate.slice(0,4), endDate.slice(4,6)-1, endDate.slice(6,8));
  const now = new Date(today.slice(0,4), today.slice(4,6)-1, today.slice(6,8));
  
  if (start <= now && end >= now) {
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return `${daysLeft}일 남음`;
  } else if (start > now) {
    const daysUntil = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
    return `${daysUntil}일 후 시작`;
  }
  return '종료';
}

// 이번 주 토요일
function getThisSaturday() {
  const today = new Date();
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + (6 - today.getDay()));
  return saturday;
}

// 이번 주 일요일
function getThisSunday() {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + (7 - today.getDay()));
  return sunday;
}

// 인기 지역 계산
function getPopularRegions(festivals) {
  const regionCount = {};
  festivals.forEach(f => {
    regionCount[f.region] = (regionCount[f.region] || 0) + 1;
  });
  
  return Object.entries(regionCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([region, count]) => ({ region, count }));
}

// 샘플 축제 데이터
function getSampleFestivals(type) {
  const ongoing = [
    {
      title: '서울 빛초롱 축제',
      location: '청계천 일대',
      region: '서울',
      startDate: '2025.05.01',
      endDate: '2025.06.15',
      status: 'ongoing',
      daysLeft: '15일 남음',
      category: '문화축제',
      isToday: false
    },
    {
      title: '부산 바다축제',
      location: '해운대 해수욕장',
      region: '부산',
      startDate: '2025.05.20',
      endDate: '2025.06.05',
      status: 'ongoing', 
      daysLeft: '5일 남음',
      category: '해양축제',
      isToday: true
    },
    {
      title: '제주 유채꽃 축제',
      location: '제주 서귀포시',
      region: '제주',
      startDate: '2025.05.25',
      endDate: '2025.06.10',
      status: 'ongoing',
      daysLeft: '10일 남음',
      category: '자연축제',
      isToday: false
    }
  ];

  const upcoming = [
    {
      title: '전주 한옥마을 축제',
      location: '전주 한옥마을',
      region: '전주',
      startDate: '2025.06.10',
      endDate: '2025.06.20',
      status: 'upcoming',
      daysLeft: '10일 후 시작',
      category: '전통축제'
    },
    {
      title: '강릉 커피축제',
      location: '강릉 안목해변',
      region: '강릉',
      startDate: '2025.06.15',
      endDate: '2025.06.25',
      status: 'upcoming',
      daysLeft: '15일 후 시작',
      category: '음식축제'
    }
  ];

  const weekend = [
    {
      title: '서울 한강 축제',
      location: '한강공원',
      region: '서울',
      startDate: '2025.06.01',
      endDate: '2025.06.02',
      status: 'weekend',
      daysLeft: '이번 주말',
      category: '야외축제'
    }
  ];

  if (type === 'ongoing') return ongoing;
  if (type === 'upcoming') return upcoming;
  if (type === 'weekend') return weekend;
  return ongoing.concat(upcoming);
}
