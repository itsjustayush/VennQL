import os
from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))
readme_path = os.path.join(here, "README.md")
long_description = ""
if os.path.exists(readme_path):
    with open(readme_path, "r", encoding="utf-8") as f:
        long_description = f.read()

setup(
    name="vennql",
    version="0.1.0",
    description="The Zero-Copy, High-Throughput Binary API Framework & Protocol for Python",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Ayush & VennQL Contributors",
    author_email="contact@vennql.org",
    url="https://github.com/itsjustayush/VennQL",
    project_urls={
        "Homepage": "https://github.com/itsjustayush/VennQL",
        "Documentation": "https://github.com/itsjustayush/VennQL/blob/main/GUIDE.md",
        "Repository": "https://github.com/itsjustayush/VennQL",
        "Issue Tracker": "https://github.com/itsjustayush/VennQL/issues",
    },
    packages=find_packages(),
    package_data={
        "vennql": ["studio.html"],
    },
    include_package_data=True,
    install_requires=[
        "websockets>=12.0",
    ],
    python_requires=">=3.10",
    keywords=[
        "vennql",
        "api",
        "binary-protocol",
        "zero-copy",
        "graphql",
        "rest",
        "rpc",
        "fastapi",
        "websockets",
        "microservices"
    ],
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Internet :: WWW/HTTP",
        "Topic :: Software Development :: Libraries :: Application Frameworks",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Programming Language :: Python :: 3.13",
        "Operating System :: OS Independent",
    ],
)

