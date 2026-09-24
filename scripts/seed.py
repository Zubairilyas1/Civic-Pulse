import asyncio
import logging
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.db.session import AsyncSessionLocal
from app.models.complaint import Complaint
from app.schemas.complaint import CategoryEnum, PriorityEnum, StatusEnum
from sqlalchemy import select

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("civicpulse.seed")

# Dataset of 32 realistic Urdu-English civic complaints
SEED_COMPLAINTS = [
    {
        "title": "Major Water Pipeline Burst on Khayaban-e-Iqbal",
        "description": "Clean drinking water is leaking profusely from a main underground pipe near Sector F-7/3, wasting thousands of gallons.",
        "location": "Khayaban-e-Iqbal, Sector F-7/3, Islamabad",
        "category": CategoryEnum.WATER,
        "priority": PriorityEnum.CRITICAL,
        "status": StatusEnum.TRIAGED,
        "summary": "Critical water pipeline burst requiring immediate CDA water supply repair.",
        "triaged_by": "rule_based_v1",
    },
    {
        "title": "Deep Asphalt Pothole near G-10 Markaz Plaza",
        "description": "A 2-foot deep dangerous pothole on the main avenue causing severe vehicle damage and traffic slowdown.",
        "location": "G-10 Markaz, Islamabad",
        "category": CategoryEnum.ROADS,
        "priority": PriorityEnum.HIGH,
        "status": StatusEnum.IN_PROGRESS,
        "summary": "Dangerous road hazard identified for urgent asphalt patching.",
        "triaged_by": "groq_llama3",
    },
    {
        "title": "Transformer Sparking Hazard near Commercial Market",
        "description": "Overloaded electric transformer is producing continuous sparks and fire risk right above busy shop entrances.",
        "location": "Commercial Market, Satellite Town, Rawalpindi",
        "category": CategoryEnum.ELECTRICITY,
        "priority": PriorityEnum.CRITICAL,
        "status": StatusEnum.TRIAGED,
        "summary": "Severe high-voltage fire hazard requiring emergency IESCO team dispatch.",
        "triaged_by": "rule_based_v1",
    },
    {
        "title": "Uncollected Trash Dump Heap at Barkat Market Block 4",
        "description": "Garbage bins have been overflowing for 5 days. Stink and flies are spreading near food stalls.",
        "location": "Barkat Market, New Garden Town, Lahore",
        "category": CategoryEnum.WASTE,
        "priority": PriorityEnum.HIGH,
        "status": StatusEnum.SUBMITTED,
        "summary": "Solid waste accumulation reported near commercial food zone.",
        "triaged_by": "simulated_v1",
    },
    {
        "title": "Sewer Gutters Overflowing in Street 14 Sector I-9",
        "description": "Black contaminated sewage water spilling onto street sidewalk causing unbearable odor and health hazard.",
        "location": "Street 14, Sector I-9/2, Islamabad",
        "category": CategoryEnum.SANITATION,
        "priority": PriorityEnum.HIGH,
        "status": StatusEnum.RESOLVED,
        "summary": "Sanitation pipeline unblocked and gutter covers replaced.",
        "triaged_by": "groq_llama3",
    },
    {
        "title": "Pani ki main line phat gayi Sector F-11",
        "description": "Subah se saaf pani road par bah raha hai aur gharon me pani ki kami ho gayi hai.",
        "location": "Sector F-11/4, Islamabad",
        "category": CategoryEnum.WATER,
        "priority": PriorityEnum.HIGH,
        "status": StatusEnum.TRIAGED,
        "summary": "Urdu report: Main water line rupture reported in F-11.",
        "triaged_by": "rule_based_v1",
    },
    {
        "title": "Bijli wire dangles dangerously low on Main Mall Road",
        "description": "High voltage electric wire hanging down to shoulder height near bus stop. Extreme electrocution risk.",
        "location": "Mall Road, Near Regal Chowk, Lahore",
        "category": CategoryEnum.ELECTRICITY,
        "priority": PriorityEnum.CRITICAL,
        "status": StatusEnum.IN_PROGRESS,
        "summary": "Critical electrocution hazard needing immediate LESCO line repair.",
        "triaged_by": "groq_llama3",
    },
    {
        "title": "Broken Street Lights along Murree Road",
        "description": "A stretch of 12 consecutive street poles are non-functional causing dark conditions and safety concerns.",
        "location": "Murree Road, Near Faizabad, Rawalpindi",
        "category": CategoryEnum.ELECTRICITY,
        "priority": PriorityEnum.MEDIUM,
        "status": StatusEnum.SUBMITTED,
        "summary": "Street lighting outage reported.",
        "triaged_by": "simulated_v1",
    },
    {
        "title": "Broken Footpath Slabs on University Road",
        "description": "Missing concrete slabs on pedestrian walkway causing trip hazards for university students.",
        "location": "University Road, Gulshan-e-Iqbal, Karachi",
        "category": CategoryEnum.ROADS,
        "priority": PriorityEnum.LOW,
        "status": StatusEnum.TRIAGED,
        "summary": "Pedestrian pathway maintenance issue.",
        "triaged_by": "rule_based_v1",
    },
    {
        "title": "Illegal Waste Dumping near Nullah Lai Bank",
        "description": "Construction debris and plastic bags dumped illegally along river bank threatening monsoon drainage.",
        "location": "Katamarian, Nullah Lai, Rawalpindi",
        "category": CategoryEnum.WASTE,
        "priority": PriorityEnum.HIGH,
        "status": StatusEnum.TRIAGED,
        "summary": "Illegal dumping endangering storm drainage capacity.",
        "triaged_by": "groq_llama3",
    },
    {
        "title": "Low Water Pressure in Block C Faisal Town",
        "description": "Water supply pressure has dropped significantly over the last two weeks.",
        "location": "Block C, Faisal Town, Lahore",
        "category": CategoryEnum.WATER,
        "priority": PriorityEnum.LOW,
        "status": StatusEnum.SUBMITTED,
        "summary": "Routine water pressure query.",
        "triaged_by": "simulated_v1",
    },
    {
        "title": "Clogged Storm Drain near Tariq Road Signal",
        "description": "Plastic bottles clogging main storm drain grate causing water pooling after light rain.",
        "location": "Tariq Road, PECHS, Karachi",
        "category": CategoryEnum.SANITATION,
        "priority": PriorityEnum.MEDIUM,
        "status": StatusEnum.IN_PROGRESS,
        "summary": "Drain clearing required to prevent urban flooding.",
        "triaged_by": "rule_based_v1",
    },
    {
        "title": "Traffic Light Failure at Zero Point Interchange",
        "description": "Signal lights stuck on red causing traffic gridlock during rush hour.",
        "location": "Zero Point Interchange, Islamabad",
        "category": CategoryEnum.ROADS,
        "priority": PriorityEnum.HIGH,
        "status": StatusEnum.RESOLVED,
        "summary": "Traffic signal controller reset and restored.",
        "triaged_by": "groq_llama3",
    },
    {
        "title": "Rasta band hai sadak par mitti ke dher ki wajah se",
        "description": "Construction material Sadak ke beech pada hua hai aur traffic blocked hai.",
        "location": "Sector G-8/1, Islamabad",
        "category": CategoryEnum.ROADS,
        "priority": PriorityEnum.MEDIUM,
        "status": StatusEnum.TRIAGED,
        "summary": "Urdu report: Construction material obstruction on public road.",
        "triaged_by": "rule_based_v1",
    },
    {
        "title": "Open Manhole without Cover in Sector H-11",
        "description": "Missing manhole cover on unlit street pose fatal danger for pedestrians and children at night.",
        "location": "Street 9, Sector H-11, Islamabad",
        "category": CategoryEnum.SANITATION,
        "priority": PriorityEnum.CRITICAL,
        "status": StatusEnum.TRIAGED,
        "summary": "Fatal safety hazard open manhole requiring immediate metal cover placement.",
        "triaged_by": "groq_llama3",
    },
    {
        "title": "Contaminated Tap Water in Saddar Area",
        "description": "Tap water coming out muddy and smelling foul. Suspected cross-contamination with sewer line.",
        "location": "Bank Road, Saddar, Rawalpindi",
        "category": CategoryEnum.WATER,
        "priority": PriorityEnum.CRITICAL,
        "status": StatusEnum.IN_PROGRESS,
        "summary": "Water contamination issue endangering public health.",
        "triaged_by": "groq_llama3",
    },
    {
        "title": "Overhanging Tree Branches touching Power Line",
        "description": "Tree branches touching overhead 11kV line during windstorms causing frequent tripping.",
        "location": "Kashmir Highway, Sector G-7, Islamabad",
        "category": CategoryEnum.ELECTRICITY,
        "priority": PriorityEnum.MEDIUM,
        "status": StatusEnum.SUBMITTED,
        "summary": "Tree trimming request around power lines.",
        "triaged_by": "rule_based_v1",
    },
    {
        "title": "Hospital Waste Dumped near School Boundary",
        "description": "Medical syringes and hazardous waste dumped near primary school gate.",
        "location": "Holy Family Road, Rawalpindi",
        "category": CategoryEnum.WASTE,
        "priority": PriorityEnum.CRITICAL,
        "status": StatusEnum.TRIAGED,
        "summary": "Hazardous bio-medical waste removal required immediately.",
        "triaged_by": "groq_llama3",
    },
    {
        "title": "Damaged Road Median Barrier on Expressway",
        "description": "Concrete median barrier broken after vehicle collision leaving dangerous rebar exposed.",
        "location": "Islamabad Expressway near Khanna Pul",
        "category": CategoryEnum.ROADS,
        "priority": PriorityEnum.HIGH,
        "status": StatusEnum.TRIAGED,
        "summary": "Highway safety barrier repair.",
        "triaged_by": "rule_based_v1",
    },
    {
        "title": "Water Tank Leakage at Public Community Center",
        "description": "Overhead municipal water storage tank overflowing continuously due to broken float valve.",
        "location": "Community Center, Sector G-6/2, Islamabad",
        "category": CategoryEnum.WATER,
        "priority": PriorityEnum.LOW,
        "status": StatusEnum.RESOLVED,
        "summary": "Float valve replaced, leakage stopped.",
        "triaged_by": "simulated_v1",
    },
    {
        "title": "Kachra Jalane se severe air pollution in Sector I-10",
        "description": "Open burning of plastic garbage every evening generating toxic smoke.",
        "location": "Sector I-10/3, Islamabad",
        "category": CategoryEnum.WASTE,
        "priority": PriorityEnum.HIGH,
        "status": StatusEnum.TRIAGED,
        "summary": "Illegal open trash burning causing air quality hazard.",
        "triaged_by": "groq_llama3",
    },
    {
        "title": "Faulty Meter Box sparking in Apartment Complex",
        "description": "Main electrical meter distribution panel making buzzing sounds and smell of burning insulation.",
        "location": "Shaheen Complex, Gulberg III, Lahore",
        "category": CategoryEnum.ELECTRICITY,
        "priority": PriorityEnum.HIGH,
        "status": StatusEnum.IN_PROGRESS,
        "summary": "Electrical distribution box inspection.",
        "triaged_by": "rule_based_v1",
    },
    {
        "title": "Stagnant Water Pool breeding Mosquitoes",
        "description": "Water ponding in vacant plot for 3 weeks leading to dengue mosquito concern.",
        "location": "DHA Phase 5, Lahore",
        "category": CategoryEnum.SANITATION,
        "priority": PriorityEnum.MEDIUM,
        "status": StatusEnum.TRIAGED,
        "summary": "Vector control anti-dengue spray requested.",
        "triaged_by": "rule_based_v1",
    },
    {
        "title": "Speed Breaker Unmarked on Double Road",
        "description": "Newly constructed high speed breaker has no yellow paint warning signs causing vehicle damage.",
        "location": "Double Road, Sector F-8, Islamabad",
        "category": CategoryEnum.ROADS,
        "priority": PriorityEnum.LOW,
        "status": StatusEnum.SUBMITTED,
        "summary": "Road marking request for speed hump.",
        "triaged_by": "simulated_v1",
    },
    {
        "title": "Sewage Pumping Station Power Outage",
        "description": "Pumping station backup generator failed, backup battery dead.",
        "location": "Clifton Block 2, Karachi",
        "category": CategoryEnum.SANITATION,
        "priority": PriorityEnum.HIGH,
        "status": StatusEnum.TRIAGED,
        "summary": "Sewage pump facility power restoration.",
        "triaged_by": "groq_llama3",
    },
    {
        "title": "Gali me 3 din se street light band hai",
        "description": "Andhera hone ki wajah se chori ka khatra barh gaya hai.",
        "location": "Street 4, Sector G-9/1, Islamabad",
        "category": CategoryEnum.ELECTRICITY,
        "priority": PriorityEnum.LOW,
        "status": StatusEnum.REJECTED,
        "summary": "Duplicate street light outage report.",
        "triaged_by": "rule_based_v1",
    },
    {
        "title": "Commercial Construction Noise after Midnight",
        "description": "Heavy machinery operating beyond permitted hours in residential zone.",
        "location": "Sector F-6/2, Islamabad",
        "category": CategoryEnum.OTHER,
        "priority": PriorityEnum.LOW,
        "status": StatusEnum.SUBMITTED,
        "summary": "Noise pollution complaint.",
        "triaged_by": "simulated_v1",
    },
    {
        "title": "Water Valve Box Broken on Main Boulevard",
        "description": "Cast iron valve chamber lid crushed by heavy truck.",
        "location": "Main Boulevard, Johar Town, Lahore",
        "category": CategoryEnum.WATER,
        "priority": PriorityEnum.MEDIUM,
        "status": StatusEnum.TRIAGED,
        "summary": "Water infrastructure chamber cover replacement.",
        "triaged_by": "rule_based_v1",
    },
    {
        "title": "Hazardous Loose Cable on Pedestrian Bridge",
        "description": "Telecom optical fiber cable hanging loose across footbridge stairs.",
        "location": "Seventh Avenue Footbridge, Islamabad",
        "category": CategoryEnum.ELECTRICITY,
        "priority": PriorityEnum.LOW,
        "status": StatusEnum.RESOLVED,
        "summary": "Telecom cable re-secured.",
        "triaged_by": "rule_based_v1",
    },
    {
        "title": "Animal Carcass on Expressway Shoulder",
        "description": "Dead stray animal on road shoulder creating foul smell and distraction for drivers.",
        "location": "Islamabad Highway near Zero Point",
        "category": CategoryEnum.WASTE,
        "priority": PriorityEnum.MEDIUM,
        "status": StatusEnum.RESOLVED,
        "summary": "Sanitation crew removed carcass.",
        "triaged_by": "simulated_v1",
    },
    {
        "title": "Public Park Gate Hinge Broken",
        "description": "Entrance gate hanging on single hinge dangerous for children.",
        "location": "Kachnar Park, Sector I-8/3, Islamabad",
        "category": CategoryEnum.OTHER,
        "priority": PriorityEnum.LOW,
        "status": StatusEnum.SUBMITTED,
        "summary": "Park maintenance repair.",
        "triaged_by": "simulated_v1",
    },
    {
        "title": "Drainage Culvert Blocked by Fallen Tree",
        "description": "Monsoon storm knocked down large tree trunk blocking culvert flow.",
        "location": "Margalla Road, Sector E-7, Islamabad",
        "category": CategoryEnum.SANITATION,
        "priority": PriorityEnum.HIGH,
        "status": StatusEnum.IN_PROGRESS,
        "summary": "Culvert clearing in progress.",
        "triaged_by": "groq_llama3",
    },
]


async def seed_database():
    """Seed complaints idempotently into database."""
    logger.info("Connecting to database for seeding...")
    async with AsyncSessionLocal() as session:
        inserted_count = 0
        skipped_count = 0

        for idx, item in enumerate(SEED_COMPLAINTS, 1):
            title = item["title"]

            # Idempotency check: see if complaint with title already exists
            stmt = select(Complaint).where(Complaint.title == title)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                skipped_count += 1
                logger.info(f"[{idx}/32] SKIPPED (Already exists): '{title[:40]}...'")
                continue

            # Create complaint record with staggered timestamps
            created_time = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=(32 - idx), hours=idx)

            complaint = Complaint(
                title=title,
                description=item["description"],
                location=item["location"],
                category=item["category"],
                priority=item["priority"],
                status=item["status"],
                summary=item["summary"],
                triaged_by=item["triaged_by"],
                confidence_score=0.92,
                created_at=created_time,
                updated_at=created_time,
            )
            session.add(complaint)
            inserted_count += 1
            logger.info(f"[{idx}/32] INSERTED: '{title[:40]}...'")

        await session.commit()
        logger.info(
            f"Seeding completed cleanly! Inserted: {inserted_count}, Skipped: {skipped_count}, Total: {len(SEED_COMPLAINTS)}"
        )


if __name__ == "__main__":
    try:
        asyncio.run(seed_database())
    except (OSError, RuntimeError) as e:
        logger.warning(f"Database direct connection status: {e!s}")
