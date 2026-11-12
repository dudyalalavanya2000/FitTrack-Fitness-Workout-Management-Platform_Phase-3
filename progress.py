
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models import Progress, User
from app.schemas import (
    ProgressCreate,
    ProgressUpdate,
    ProgressResponse
)
from app.dependencies import get_current_user

router = APIRouter()


# Create daily progress
@router.post(
    "/",
    response_model=ProgressResponse,
    status_code=status.HTTP_201_CREATED
)
def create_progress(
    progress_data: ProgressCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_progress = db.query(Progress).filter(
        Progress.user_id == current_user.id,
        Progress.progress_date == progress_data.progress_date
    ).first()

    if existing_progress:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Progress already exists for this date"
        )

    new_progress = Progress(
        **progress_data.model_dump(),
        user_id=current_user.id
    )

    db.add(new_progress)

    try:
        db.commit()
        db.refresh(new_progress)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Progress already exists for this date"
        )

    return new_progress


# Get all progress records for the logged-in user
@router.get("/", response_model=list[ProgressResponse])
def get_my_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    progress_records = db.query(Progress).filter(
        Progress.user_id == current_user.id
    ).order_by(Progress.progress_date.desc()).all()

    return progress_records


# Get one progress record by ID
@router.get("/{progress_id}", response_model=ProgressResponse)
def get_progress(
    progress_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    progress = db.query(Progress).filter(
        Progress.id == progress_id,
        Progress.user_id == current_user.id
    ).first()

    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Progress record not found"
        )

    return progress


# Update a progress record
@router.put("/{progress_id}", response_model=ProgressResponse)
def update_progress(
    progress_id: int,
    progress_data: ProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    progress = db.query(Progress).filter(
        Progress.id == progress_id,
        Progress.user_id == current_user.id
    ).first()

    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Progress record not found"
        )

    update_data = progress_data.model_dump(exclude_unset=True)

    if "progress_date" in update_data and update_data["progress_date"] is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Progress date cannot be null"
        )

    if "progress_date" in update_data:
        duplicate = db.query(Progress).filter(
            Progress.user_id == current_user.id,
            Progress.progress_date == update_data["progress_date"],
            Progress.id != progress.id
        ).first()

        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Progress already exists for this date"
            )

    for key, value in update_data.items():
        setattr(progress, key, value)

    try:
        db.commit()
        db.refresh(progress)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Progress already exists for this date"
        )

    return progress


# Delete a progress record
@router.delete("/{progress_id}")
def delete_progress(
    progress_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    progress = db.query(Progress).filter(
        Progress.id == progress_id,
        Progress.user_id == current_user.id
    ).first()

    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Progress record not found"
        )

    db.delete(progress)
    db.commit()

    return {
        "message": "Progress record deleted successfully"
    }
