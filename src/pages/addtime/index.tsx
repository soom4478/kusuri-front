'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './index.module.css';
import HeaderLayout from '@/components/header-layout';
import { useRouter } from 'next/router';

const ITEM_HEIGHT = 40;
const VISIBLE_COUNT = 5;
const CENTER_INDEX = Math.floor(VISIBLE_COUNT / 2);

const repeatOptions = [
  { label: '격일', value: '격일' },
  { label: '매일', value: '매일' },
  { label: '월요일마다', value: 'Mon' },
  { label: '화요일마다', value: 'Tue' },
  { label: '수요일마다', value: 'Wed' },
  { label: '목요일마다', value: 'Thu' },
  { label: '금요일마다', value: 'Fri' },
  { label: '토요일마다', value: 'Sat' },
  { label: '일요일마다', value: 'Sun' },
];

const AddTime = () => {
  const router = useRouter();
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState('AM');
  const [selectedRepeat, setSelectedRepeat] = useState('');
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [startDay, setStartDay] = useState('');
  const [lastDay, setLastDay] = useState('');
  const [medicine, setMedicine] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (router.isReady) {
      const queryStart = router.query.start_day as string;
      const queryLast = router.query.last_day as string;
      const queryMedicine = router.query.medicine as string;
      if (queryStart) setStartDay(queryStart);
      if (queryLast) setLastDay(queryLast);
      if (queryMedicine) setMedicine(queryMedicine);
    }
  }, [router.isReady, router.query]);

  const isComplete = hour && minute && ampm && selectedRepeat && startDay && lastDay;

  const hoursRaw = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutesRaw = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const repeatCount = 30;

  const hours = Array.from({ length: hoursRaw.length * repeatCount }, (_, i) => hoursRaw[i % hoursRaw.length]);
  const minutes = Array.from({ length: minutesRaw.length * repeatCount }, (_, i) => minutesRaw[i % minutesRaw.length]);
  const ampmList = ['', '', 'AM', 'PM', '', ''];

  const renderWheel = (items: string[], selected: string, onSelect: (v: string) => void, isAmpm = false) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (ref.current) {
        const idx = items.findIndex(item => item === selected);
        const scrollTop = (idx - CENTER_INDEX) * ITEM_HEIGHT;
        ref.current.scrollTop = scrollTop >= 0 ? scrollTop : 0;
      }
    }, [items.length]);

    const handleScroll = () => {
      if (!ref.current) return;
      const scrollTop = ref.current.scrollTop;
      const idx = Math.round(scrollTop / ITEM_HEIGHT) + CENTER_INDEX;
      if (idx >= 0 && idx < items.length) {
        const v = items[idx];
        if (v && v !== selected) onSelect(v);
      }

      if (!isAmpm && items.length > 20) {
        const buffer = ITEM_HEIGHT * 20;
        if (scrollTop < buffer || scrollTop > ref.current.scrollHeight - ref.current.clientHeight - buffer) {
          const visibleCount = items.length / repeatCount;
          const offset = (idx - CENTER_INDEX) % visibleCount;
          const base = Math.floor(items.length / 2) - (Math.floor(items.length / 2) % visibleCount);
          ref.current.scrollTop = (base + offset) * ITEM_HEIGHT - CENTER_INDEX * ITEM_HEIGHT;
        }
      }
    };

    return (
      <div
        className={styles.wheelContainer}
        ref={ref}
        onScroll={handleScroll}
        style={{ height: ITEM_HEIGHT * VISIBLE_COUNT }}
      >
        {items.map((item, i) => {
          const centerIdx = Math.round(ref.current?.scrollTop! / ITEM_HEIGHT) + CENTER_INDEX;
          const isSel = i === centerIdx && item !== '';
          return (
            <div key={i} className={`${styles.wheelItem} ${isSel ? styles.selected : ''}`}>
              {item}
            </div>
          );
        })}
      </div>
    );
  };

  const handleNext = async () => {
    if (!isComplete || submitting) return;

    setSubmitting(true);

    let h = parseInt(hour);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;

    const timeString = `${String(h).padStart(2, '0')}:${minute}:00`;
    const timeslot = ampm === 'AM' ? '오전' : '오후';

    const payload = {
      start_day: startDay,
      last_day: lastDay,
      time: timeString,
      timeslot,
      day_type: selectedRepeat, // value만 서버로 전달
      medicine,
    };

    try {
      const res = await fetch('/api/alarms/alarm-setting', {
        method: 'POST',
        credentials: 'include' ,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        router.push('/failalram'); // 중복된 알람
      } else if (res.ok) {
        router.push('/finishalarm'); // 정상 등록
      } else {
        console.error('알람 저장 실패:', res.status);
        router.push('/failalram'); // 기타 실패
      }
    } catch (e) {
      console.error('알람 저장 중 네트워크 오류:', e);
      router.push('/failalram');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeaderLayout>알람추가</HeaderLayout>
      <div className={styles.wrapper}>
        <div className={styles.wheelWrapper}>
          <div className={styles.centerOverlay} />
          {renderWheel(hours, hour, setHour)}
          {renderWheel(minutes, minute, setMinute)}
          {renderWheel(ampmList, ampm, setAmpm, true)}
        </div>

        <div className={styles.dropdownWrapper}>
          <div className={styles.selectedBox} onClick={() => setRepeatOpen(prev => !prev)}>
            {repeatOptions.find(opt => opt.value === selectedRepeat)?.label || '반복 설정 선택'}
            <span className={styles.arrow}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M6 9L12 15L18 9" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
          {repeatOpen && (
            <div className={styles.optionList}>
              {repeatOptions.map(opt => (
                <div
                  key={opt.value}
                  className={styles.optionItem}
                  onClick={() => {
                    setSelectedRepeat(opt.value); // value만 저장
                    setRepeatOpen(false);
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.nextButtonContainer}>
        <button
          className={`${styles.nextButton} ${isComplete ? styles.clicked : ''}`}
          onClick={handleNext}
          disabled={!isComplete || submitting}
        >
          다음
        </button>
      </div>
    </>
  );
};

export default AddTime;
