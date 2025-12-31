from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

URL="libsql://techsprint-pythonjava098.aws-ap-south-1.turso.io"
Base=declarative_base()
engine=create_engine(URL)
SessionLocal=sessionmaker(autoflush=False,autocommit=False,bind=engine)




