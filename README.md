# 📚 묵독 (MOOKDOG) - 온라인 도서 서점

> **카카오 도서 검색 Open API**를 활용한 모던 & 미니멀 감성의 온라인 서점 웹 애플리케이션입니다.  
> 책 검색부터 카테고리 필터링, 상세 정보 조회, 그리고 로컬스토리지 기반의 장바구니 기능까지 제공합니다.

🔗 **배포 주소 (Live Demo)**: [https://sh11025.github.io/MOOKDOG/](https://sh11025.github.io/MOOKDOG/)

---

## 📌 주요 기능 (Features)

### 1. 메인 페이지 (`main_page.html`)
- **히어로 큐레이션**: 엄선된 추천 도서 배너 및 소개
- **도서 캐러셀 (슬라이더)**:
  - 카카오 도서 검색 API를 연동하여 주목할 만한 베스트셀러 및 최신 문학 도서 실시간 조회
  - 좌우 슬라이드 스크롤 내비게이션
- **글로벌 검색**: 도서명, 저자 키워드 검색을 통해 카탈로그 페이지로 즉각 이동

### 2. 카탈로그 / 도서 목록 (`sub_page.html`)
- **다중 카테고리 필터링**: 소설, 인문, 경제/경영, 시/에세이, 예술 등 관심 분야 다중 선택 필터
- **가격 범위 필터링**: 슬라이더 및 직접 입력을 통한 가격대별 도서 탐색
- **도서 정렬**: 정확도순, 최신순, 가격순 등 다양한 조건 정렬 지원
- **도서 카드**: 표지 이미지, 제목, 저자, 출판사, 판매가, 장바구니 바로 담기 인터랙션 제공

### 3. 상품 상세 페이지 (`shop_page.html`)
- **도서 상세 정보**: 고해상도 표지, 출판일, 정가 및 할인 판매가, 도서 소개글, ISBN 등 상세 스펙
- **구매 및 수량 조절**: 원하는 수량 선택 및 장바구니 추가, 토스트 알림 표시
- **연관 추천 도서**: 동일 카테고리/키워드 기반 추천 도서 목록

### 4. 장바구니 시스템 (`cart.js`)
- **슬라이드 드로어 UI**: 페이지 이동 없이 우측에서 열리는 장바구니 드로어
- **데이터 영속성**: 브라우저 `localStorage`를 활용하여 새로고침이나 페이지 이동 후에도 장바구니 품목 유지
- **실시간 합산**: 수량 변경 및 개별 삭제 시 총 주문 금액 실시간 계산

---

## 🛠 기술 스택 (Tech Stack)

| 구분 | 기술 / 도구 |
| :--- | :--- |
| **Frontend** | HTML5, JavaScript (ES6+), Tailwind CSS |
| **Icon & Font** | Google Material Symbols, Google Fonts |
| **API** | Kakao Book Search Open API (카카오 도서 검색 API) |
| **Storage** | Browser LocalStorage |
| **Deployment** | GitHub Pages |

---

## 📁 프로젝트 구조 (Directory Structure)

```text
├── css/
│   └── style.css            # 커스텀 스타일시트
├── image/
│   └── logo.png             # 브랜드 로고 이미지
├── js/
│   ├── cart.js              # 장바구니 상태 관리 및 드로어 UI
│   ├── main.js              # 메인 페이지 캐러셀 및 도서 API 호출
│   ├── shop.js              # 도서 상세 페이지 렌더링 및 인터랙션
│   └── sub.js               # 카탈로그 검색 및 필터링 로직
├── json/
│   ├── catalog_books.json   # 기본 카탈로그 데이터
│   ├── detail_books.json    # 도서 상세 더미/폴백 데이터
│   └── main_books.json      # 메인 큐레이션 도서 데이터
├── index.html               # GitHub Pages 진입점 (main_page 리다이렉트)
├── main_page.html           # 메인 페이지
├── shop_page.html           # 도서 상세 페이지
├── sub_page.html            # 도서 카탈로그/검색 페이지
└── README.md                # 프로젝트 안내 문서
```

---

## 🚀 로컬 실행 방법 (Getting Started)

1. 저장소 클론:
   ```bash
   git clone https://github.com/sh11025/MOOKDOG.git
   ```
2. 해당 디렉토리로 이동:
   ```bash
   cd MOOKDOG
   ```
3. VS Code의 **Live Server** 확장 프로그램을 실행하거나, 브라우저에서 `index.html`을 엽니다.

---

## 📄 라이선스 (License)

© 2024 MOOKDOG. All rights reserved.
