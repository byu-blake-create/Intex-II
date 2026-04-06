FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["backend/NorthStarShelter.API/NorthStarShelter.API.csproj", "backend/NorthStarShelter.API/"]
RUN dotnet restore "backend/NorthStarShelter.API/NorthStarShelter.API.csproj"

COPY . .
RUN dotnet publish "backend/NorthStarShelter.API/NorthStarShelter.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "NorthStarShelter.API.dll"]
