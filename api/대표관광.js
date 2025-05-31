// pages/api/대표관광.js
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const data = {
    region: '대한민국',
    attractions: [
      {
        title: '경복궁',
        category: '역사 유적지',
        description: '조선 왕조의 법궁으로, 아름다운 궁궐과 광화문이 유명합니다.',
        image: 'https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=8b53f63e-c682-43ae-b4ab-c6ed15b6adcd',
      },
      {
        title: '남산타워(N서울타워)',
        category: '도심 전망대',
        description: '서울의 전경을 한눈에 내려다볼 수 있는 전망 명소입니다.',
        image: 'https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=6e0ff422-8eae-4d6a-8163-58039e8eae9d',
      },
      {
        title: '제주 성산일출봉',
        category: '자연 명소',
        description: '일출이 아름다운 세계자연유산으로, 제주도 관광의 대표 명소입니다.',
        image: 'https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=5cde23cb-5f59-42a7-8d6e-9d420e9036c6',
      },
      {
        title: '부산 해운대 해수욕장',
        category: '해변',
        description: '한국을 대표하는 여름 휴양지로, 깨끗한 백사장이 인상적입니다.',
        image: 'https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=c557d1f2-3825-4f30-9f99-cc2a0b07d2a5',
      },
      {
        title: '전주 한옥마을',
        category: '전통 문화',
        description: '700여 채의 한옥이 모여 있는 한국 전통문화 체험 공간입니다.',
        image: 'https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=03fd2375-dc5a-469f-90d2-09e7e7273fc6',
      }
    ],
    message: '✅ 대한민국 대표 관광지 5선 데이터 제공',
    time: new Date().toLocaleString('ko-KR'),
  };

  res.status(200).json({ success: true, data });
}
