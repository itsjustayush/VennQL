from setuptools import setup, find_packages

setup(
    name="vennql",
    version="0.1.0",
    description="The Zero-Copy, High-Throughput Binary API Framework & Protocol for Python",
    author="VennQL Contributors",
    packages=find_packages(),
    install_requires=[
        "websockets>=12.0",
    ],
    python_requires=">=3.10",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Topic :: Internet :: WWW/HTTP",
    ],
)
