import { useState, useEffect, useRef } from 'react';

const Calendar = ({ isCheckIn, onDateSelect }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const checkInCalendarRef = useRef(null);
  const checkOutCalendarRef = useRef(null);
  
  const handleClickOutside = (event) => {
    if (
      checkInCalendarRef.current && 
      !checkInCalendarRef.current.contains(event.target) &&
      checkOutCalendarRef.current && 
      !checkOutCalendarRef.current.contains(event.target)
    ) {
      setShowCalendar(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const renderCalendar = () => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Générer les jours du mois
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    // Tableau pour les jours de la semaine
    const weekdays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    
    // Générer les cellules vides pour les jours avant le 1er du mois
    const blanks = [];
    for (let i = 0; i < firstDay; i++) {
      blanks.push(<div key={`blank-${i}`} className="day-cell empty"></div>);
    }
    
    // Générer les cellules pour chaque jour du mois
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isToday = d === currentDate.getDate() && month === currentDate.getMonth() && year === currentDate.getFullYear();
      
      days.push(
        <div 
          key={`day-${d}`} 
          className={`day-cell ${isToday ? 'today' : ''}`}
          onClick={() => onDateSelect(date, isCheckIn)}
        >
          {d}
        </div>
      );
    }
    
    // Combiner les cellules vides et les jours
    const totalCells = [...blanks, ...days];
    
    return (
      <div 
        className={`calendar-dropdown ${showCalendar ? 'show' : ''}`}
        ref={isCheckIn ? checkInCalendarRef : checkOutCalendarRef}
      >
        <div className="calendar-header">
          <div className="month-selector">
            <div className="month-title">{currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</div>
          </div>
        </div>
        <div className="calendar-grid">
          {weekdays.map(day => (
            <div key={day} className="day-header">{day}</div>
          ))}
          {totalCells}
        </div>
        <div className="calendar-footer">
          <button className="calendar-button" onClick={() => setShowCalendar(false)}>
            Fermer
          </button>
        </div>
      </div>
    );
  };

  return renderCalendar();
};

export default Calendar;
